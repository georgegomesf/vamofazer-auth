import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth(async (req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    const isAuthRoute = nextUrl.pathname.startsWith("/auth");
    const isSignOutRoute = nextUrl.pathname.replace(/\/$/, "") === "/auth/signout";

    let response: NextResponse | undefined;

    if (isAuthRoute && !isSignOutRoute) {
        if (isLoggedIn) {
            const callbackUrl = nextUrl.searchParams.get("callbackUrl");
            console.log(`AUTH PROXY: User already logged in on auth route. redirecting to ${callbackUrl || "/"}`);
            if (callbackUrl) {
                try {
                    // Se o callbackUrl for relativo, usamos o host atual como base
                    const url = new URL(callbackUrl, nextUrl.origin);

                    // Validate redirect to prevent Open Redirect attacks!
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
                    const isAllowed = allowedDomains.some(domain => url.hostname.endsWith(domain) || url.hostname === domain);

                    if (!isAllowed) {
                        console.error(`AUTH PROXY: Blocked redirect to external domain: ${url.toString()}`);
                        throw new Error("Invalid domain");
                    }

                    // Se o domínio de destino for diferente do atual, enviamos um token de transferência
                    const currentHost = req.headers.get("host")?.toLowerCase() || "";
                    const targetHost = url.host.toLowerCase();
                    
                    // Compara as bases dos domínios para detectar troca de site (ex: redefilosofica vs basefilosofica)
                    const isDifferentDomain = currentHost !== targetHost;

                    console.log(`AUTH PROXY: Origin=${currentHost}, Destination=${targetHost}, isDifferent=${isDifferentDomain}`);

                    if (isDifferentDomain && req.auth?.user) {
                        try {
                            const { SignJWT } = await import("jose");
                            const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

                            console.log(`AUTH PROXY: Creating transfer token for user ${req.auth.user.email}`);

                            // Tenta obter o projectRole para o destino, caso não esteja na sessão
                            let projectRole = (req.auth.user as any).projectRole;
                            if (!projectRole && callbackUrl) {
                                try {
                                    const url = new URL(callbackUrl, nextUrl.origin);
                                    const projectId = url.searchParams.get("projectId");
                                    if (projectId && req.auth.user.id) {
                                        const { default: prisma } = await import("@/lib/prisma");
                                        let userProject = await prisma.userProject.findFirst({
                                            where: { userId: req.auth.user.id, projectId: projectId }
                                        });

                                        if (!userProject) {
                                            const projectToJoin = await prisma.project.findUnique({ where: { id: projectId } });
                                            if (projectToJoin) {
                                                userProject = await prisma.userProject.create({
                                                    data: {
                                                        userId: req.auth.user.id,
                                                        projectId: projectToJoin.id,
                                                        role: projectToJoin.defaultEntryRole || 'member'
                                                    }
                                                });
                                            }
                                        }
                                        projectRole = userProject?.role;
                                    }
                                } catch (e) { }
                            }

                            // Generate a persistent token for future API calls
                            const persistentTokenPayload = {
                                id: req.auth.user.id,
                                email: req.auth.user.email,
                                // @ts-ignore
                                role: req.auth.user.role,
                                name: req.auth.user.name,
                                projectRole: projectRole
                            };

                            const persistentToken = await new SignJWT(persistentTokenPayload)
                                .setProtectedHeader({ alg: "HS256" })
                                .setExpirationTime("7d")
                                .sign(secret);

                            const token = await new SignJWT({
                                id: req.auth.user.id,
                                email: req.auth.user.email,
                                name: req.auth.user.name,
                                image: req.auth.user.image,
                                // @ts-ignore
                                role: req.auth.user.role || "USER",
                                // @ts-ignore
                                projectRole: projectRole,
                                token: persistentToken // Pass the persistent token here
                            })
                                .setProtectedHeader({ alg: "HS256" })
                                .setExpirationTime("2m")
                                .sign(secret);

                            // Sempre forçamos o caminho do callback em redirecionamentos entre domínios
                            // para garantir que o token 'st' seja processado pelo app de destino.
                            if (!url.pathname.includes("/auth/callback")) {
                                console.log(`AUTH PROXY: Forcing callback path for ${targetHost}${url.pathname}`);
                                const originalPath = url.pathname + url.search;
                                url.pathname = "/auth/callback";

                                // Preservamos o destino original para o app redirecionar após o login
                                url.searchParams.set("dest", originalPath);
                            }

                            url.searchParams.set("st", token);
                            console.log(`AUTH PROXY: Token appended and targeting ${url.pathname}`);
                        } catch (err) {
                            console.error("AUTH PROXY: Failed to create transfer token:", err);
                        }
                    }

                    response = NextResponse.redirect(url.toString());
                } catch (e) {
                    console.error("AUTH PROXY: Invalid callbackUrl:", callbackUrl);
                }
            }
            if (!response) {
                response = NextResponse.redirect(new URL("/", nextUrl).toString());
            }
        }
    }

    // Clean up our previous experimental cookie so it doesn't get stuck forever
    if (req.cookies.has("origin_project_id")) {
        if (!response) {
            response = NextResponse.next();
        }
        response.cookies.delete("origin_project_id");
    }

    return response;
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
