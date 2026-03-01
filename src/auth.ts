import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import Email from "next-auth/providers/email";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Email({
            server: {}, // Dummy to satisfy NextAuth initialization, our custom sendVerificationRequest uses fetch
            from: process.env.EMAIL_FROM,
            async sendVerificationRequest({ identifier: email, url, provider }) {
                const { host } = new URL(url);

                const res = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'api-key': process.env.BREVO_API_KEY as string,
                        'content-type': 'application/json',
                        'accept': 'application/json',
                    },
                    body: JSON.stringify({
                        sender: {
                            name: "VamoFazer",
                            email: process.env.EMAIL_FROM
                        },
                        to: [{ email }],
                        subject: `Seu link de acesso para ${host}`,
                        htmlContent: `
              <div style="background: #050505; color: white; padding: 40px; font-family: sans-serif; border-radius: 24px; border: 1px solid #27272a; max-width: 600px; margin: auto;">
                <div style="margin-bottom: 30px; text-align: center;">
                  <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">VamoFazer</h1>
                </div>
                <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5;">Você solicitou um acesso seguro à nossa plataforma. Clique no botão abaixo para confirmar sua identidade e entrar.</p>
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${url}" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">Confirmar Identidade</a>
                </div>
                <p style="font-size: 12px; color: #52525b; text-align: center; margin-top: 40px;">Este link expira em breve. Se você não solicitou este acesso, pode ignorar este e-mail com segurança.</p>
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

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
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
                if (account?.provider === "google" || account?.provider === "email") {
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
                            emailVerified: new Date()
                        }
                    });

                    // Atualiza o objeto do usuário na memória para que o JWT receba os dados novos imediatamente
                    // @ts-ignore
                    user.role = "USER";
                    // @ts-ignore
                    user.emailVerified = new Date();
                }

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
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                // @ts-ignore
                token.role = user.role;
            }
            return token;
        },
    },
    events: {
        async createUser({ user }) {
            // Garante que novos usuários via Google/Email já nasçam como USER
            if (user.id && user.email) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        role: "USER",
                        emailVerified: new Date()
                    }
                });
                console.log("Novo usuário criado e promovido:", user.email);
            }
        }
    },
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/signin",
    },
});
