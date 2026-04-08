import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import Email from "next-auth/providers/email";
import bcrypt from "bcryptjs";
import { headers, cookies } from "next/headers";
import { getWallClockNow } from "@/lib/date-utils";

async function getOriginProjectId() {
    let projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
    try {
        const cookieStore = await cookies();
        // Fallback names for cookie domain/auth settings
        const cbUrl = cookieStore.get("__Secure-authjs.callback-url")?.value || cookieStore.get("authjs.callback-url")?.value;
        if (cbUrl) {
            const tempUrl = cbUrl.startsWith("http") ? cbUrl : `http://localhost${cbUrl}`;
            const urlObj = new URL(tempUrl);
            const fromCookie = urlObj.searchParams.get("projectId");
            if (fromCookie) {
                projectId = fromCookie;
            } else {
                const destUrl = urlObj.searchParams.get("callbackUrl");
                if (destUrl) {
                    const destUrlObj = new URL(destUrl.startsWith("http") ? destUrl : `http://localhost${destUrl}`);
                    const destProjectId = destUrlObj.searchParams.get("projectId");
                    if (destProjectId) projectId = destProjectId;
                }
            }
        }
    } catch (e) { }
    return projectId;
}

/**
 * Ensures the user is associated with the current project
 */
async function ensureUserProjectAssociation(userId: string) {
    if (!userId) {
        console.warn("AUTH: ensureUserProjectAssociation called without userId");
        return null;
    }
    
    try {
        const projectId = await getOriginProjectId();
        if (!projectId) {
            console.warn(`AUTH: No project ID found for association of user ${userId}`);
            return null;
        }

        let userProject = await prisma.userProject.findUnique({
            where: {
                userId_projectId: {
                    userId: userId,
                    projectId: projectId
                }
            }
        });

        if (!userProject) {
            // First check if user and project actually exist to provide better error messages
            const [userExist, project] = await Promise.all([
                prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
                prisma.project.findUnique({ where: { id: projectId } })
            ]);

            if (!userExist) {
                console.error(`AUTH: Cannot associate user ${userId} with project ${projectId} - USER DOES NOT EXIST in database.`);
                return null;
            }

            if (!project) {
                console.error(`AUTH: Cannot associate user ${userId} with project ${projectId} - PROJECT DOES NOT EXIST in database.`);
                return null;
            }

            try {
                userProject = await prisma.userProject.create({
                    data: {
                        userId: userId,
                        projectId: project.id,
                        role: project.defaultEntryRole || 'member'
                    }
                });
                console.log(`AUTH: User ${userId} auto-associated with project ${project.name} (${project.id}) with role ${userProject.role}`);
            } catch (createError) {
                console.error(`AUTH: Failed to create UserProject association for user ${userId} and project ${projectId}:`, createError);
                return null;
            }
        }
        return userProject;
    } catch (error) {
        console.error(`AUTH: Unexpected error in ensureUserProjectAssociation for user ${userId}:`, error);
        return null;
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    trustHost: true,
    debug: true,
    secret: process.env.AUTH_SECRET,
    adapter: PrismaAdapter(prisma),
    basePath: "/api/auth",
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "select_account",
                    access_type: "offline",
                    response_type: "code",
                },
            },
            profile(profile) {
                return {
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    emailVerified: getWallClockNow(),
                    role: "USER",
                } as any;
            },
        }),
        Email({
            server: {}, // Dummy to satisfy NextAuth initialization, our custom sendVerificationRequest uses fetch
            from: process.env.EMAIL_FROM,
            async sendVerificationRequest({ identifier: email, url, provider }) {
                const verificationUrl = new URL(url);
                const callbackUrl = verificationUrl.searchParams.get("callbackUrl");
                const { host } = new URL(url);

                let displayHost = host;
                let projectName = "Autenticação"; // Default fallback
                let projectEmail = process.env.EMAIL_FROM;
                let displayProjectId = "default"; // For debugging

                // Tenta carregar o projeto padrão do banco como base
                const defaultProjectId = process.env.NEXT_PUBLIC_PROJECT_ID;
                if (defaultProjectId) {
                    const defaultProject = await prisma.project.findUnique({ where: { id: defaultProjectId } });
                    if (defaultProject) {
                        projectName = defaultProject.name;
                        if (defaultProject.email) projectEmail = defaultProject.email;
                    }
                }

                if (callbackUrl) {
                    try {
                        let hostToUse = "";
                        let parsedUrl = callbackUrl;

                        if (parsedUrl.includes("callbackUrl=")) {
                            const dummyBase = "http://localhost";
                            const tempUrl = new URL(parsedUrl.startsWith("/") ? dummyBase + parsedUrl : parsedUrl);
                            const nestedCallback = tempUrl.searchParams.get("callbackUrl");
                            if (nestedCallback) {
                                parsedUrl = nestedCallback;
                            }
                        }

                        let cbUrl;
                        if (parsedUrl.startsWith("http")) {
                            cbUrl = new URL(parsedUrl);
                            hostToUse = cbUrl.host;
                        } else {
                            cbUrl = new URL(parsedUrl, "http://localhost");
                        }
                        const projectId = cbUrl.searchParams.get("projectId");
                        if (projectId) displayProjectId = projectId;

                        // Tenta encontrar o projeto pelo ID ou pelo Domínio (hostToUse)
                        const project = await prisma.project.findFirst({
                            where: {
                                OR: [
                                    ...(projectId ? [{ id: projectId }] : []),
                                    ...(hostToUse ? [{ link: { contains: hostToUse } }] : [])
                                ]
                            }
                        });

                        if (project) {
                            projectName = project.name;
                            if (project.email) projectEmail = project.email;
                            if (projectId) displayProjectId = projectId; else displayProjectId = project.id;
                            if (hostToUse) displayHost = hostToUse;
                        }


                    } catch (e) { }
                }

                const res = await fetch(process.env.BREVO_API_URL!, {
                    method: 'POST',
                    headers: {
                        'api-key': process.env.BREVO_API_KEY as string,
                        'content-type': 'application/json',
                        'accept': 'application/json',
                    },
                    body: JSON.stringify({
                        sender: {
                            name: projectName,
                            email: projectEmail
                        },
                        to: [{ email }],
                        subject: `Seu link de acesso para ${projectName}`,
                        htmlContent: `
              <div style="background: #050505; color: white; padding: 40px; font-family: sans-serif; border-radius: 24px; border: 1px solid #27272a; max-width: 600px; margin: auto;">
                <div style="margin-bottom: 30px; text-align: center;">
                  <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">${projectName}</h1>
                </div>
                <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5;">Você solicitou um acesso seguro à plataforma <strong>${projectName}</strong>. Clique no botão abaixo para confirmar sua identidade e entrar.</p>
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${url}" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">Confirmar Identidade</a>
                </div>
                <p style="font-size: 12px; color: #52525b; text-align: center; margin-top: 40px;">Este link expira em breve. Se você não solicitou este acesso através de ${projectName}, pode ignorar este e-mail com segurança.</p>
              </div>
            `
                    })
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(JSON.stringify(error));
                }
            },
        }),
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.password) return null;

                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isPasswordValid) return null;

                if (!user.emailVerified) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            try {
                if (!user?.email) return true;

                // @ts-ignore
                if (user?.role === "BLOCKED") {
                    console.log("Login negado: Usuário bloqueado", user.email);
                    return false;
                }

                // Se for login via Google ou Email
                return true;
            } catch (error) {
                console.error("Erro no callback signIn:", error);
                return true;
            }
        },
        async session({ session, user, token }) {
            if (session.user) {
                // @ts-ignore
                session.user.id = user?.id || token?.sub;
                // @ts-ignore
                session.user.role = user?.role || token?.role;
                // @ts-ignore
                session.user.projectRole = (user as any)?.projectRole || token?.projectRole;
                // @ts-ignore
                session.user.image = (user as any)?.image || token?.picture || token?.image;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                // @ts-ignore
                token.role = user.role;
                // @ts-ignore
                token.picture = (user as any).image;
            }

            // Tenta obter o projectRole para o projeto atual
            const projectId = await getOriginProjectId();
            if (projectId && token.sub) {
                const userProject = await ensureUserProjectAssociation(token.sub);
                if (userProject) {
                    // @ts-ignore
                    token.projectRole = userProject.role;
                }
            }

            return token;
        },
        async redirect({ url, baseUrl }) {
            try {
                // Allow redirects to our domains and localhost for development
                const envDomains = process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(",").map(d => d.trim()) : [];
                const allowedDomains = [
                    "localhost", 
                    "vamofazer.com.br", 
                    "redefilosofica.com.br", 
                    "basefilosofica.com.br",
                    "levinasbrasil.com.br", 
                    "ge-sartre.com.br",
                    ...envDomains
                ];

                const parsedUrl = new URL(url.startsWith("http") ? url : `${baseUrl}${url}`);
                const isAllowed = allowedDomains.some(domain => {
                    const hostname = parsedUrl.hostname.toLowerCase();
                    const target = domain.toLowerCase();
                    return hostname === target || hostname.endsWith(`.${target}`);
                });

                if (!isAllowed) {
                    console.log(`AUTH SERVICE: Blocked redirect to external domain: ${url}`);
                    return baseUrl;
                }

                // ESTRATÉGIA SSO: Se o domínio for EXTRENO (não é o Auth Service), 
                // e não estamos vindo de uma rota de API (onde o middleware não atua),
                // redirecionamos para o /auth/signin que o nosso middleware (proxy.ts) intercepta
                // e gera o token 'st'.
                const authHost = new URL(baseUrl).host;
                if (parsedUrl.host !== authHost && !parsedUrl.pathname.includes("/auth/callback") && !parsedUrl.searchParams.has("fromSignOut")) {
                    console.log(`AUTH SERVICE: Redirecting from API to Interstitial for ${parsedUrl.host}`);
                    return `${baseUrl}/auth/signin?callbackUrl=${encodeURIComponent(url)}`;
                }

                return url;
            } catch (e) {
                console.error("AUTH SERVICE: Error in redirect callback:", e);
                return baseUrl;
            }
        },
    },
    events: {
        async signIn({ user, account }) {
            try {
                if (user?.email && (account?.provider === "google" || account?.provider === "email")) {
                    // Promoção automática para USER ao logar via Google/MagicLink
                    await prisma.user.updateMany({
                        where: {
                            email: user.email,
                            OR: [
                                { role: "VISITOR" },
                                { emailVerified: null }
                            ]
                        },
                        data: {
                            role: "USER",
                            emailVerified: getWallClockNow()
                        }
                    });

                    if (user.id) {
                        await ensureUserProjectAssociation(user.id);
                    }
                }
            } catch (error) {
                console.error("Erro no evento signIn:", error);
            }
        },
        async createUser({ user }) {
            try {
                if (user.id) {
                    // Define role inicial como USER e email verificado para novos usuários de provedores externos
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            role: "USER",
                            emailVerified: getWallClockNow()
                        }
                    });

                    console.log("Novo usuário criado e promovido para USER:", user.email);
                    await ensureUserProjectAssociation(user.id);
                }
            } catch (error) {
                console.error("Erro ao configurar novo usuário:", error);
            }
        }
    },
    session: {
        strategy: "jwt",
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production" ? `__Secure-authjs.session-token` : `authjs.session-token`,
            options: {
                httpOnly: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
            },
        },
    },
    pages: {
        signIn: "/auth/signin",
        error: "/auth/signin", // Redireciona erros para a tela de login
    },
});

