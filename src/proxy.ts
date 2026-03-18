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
                    const allowedDomains = ["localhost", "vamofazer.com.br", "redefilosofica.com.br"];
                    const isAllowed = allowedDomains.some(domain => url.hostname.endsWith(domain) || url.hostname === domain);

                    if (!isAllowed) {
                        console.error(`AUTH PROXY: Blocked redirect to external domain: ${url.toString()}`);
                        throw new Error("Invalid domain");
                    }

                    // Se o domínio de destino for diferente do atual, enviamos um token de transferência
                    const currentHost = req.headers.get("host") || "";
                    const targetHost = url.host;

                    console.log(`AUTH PROXY: Origin=${currentHost}, Destination=${targetHost}`);

                    if (currentHost !== targetHost && req.auth?.user) {
                        try {
                            const { SignJWT } = await import("jose");
                            const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

                            console.log(`AUTH PROXY: Creating transfer token for user ${req.auth.user.email}`);

                            const token = await new SignJWT({
                                id: req.auth.user.id,
                                email: req.auth.user.email,
                                name: req.auth.user.name,
                                // @ts-ignore
                                role: req.auth.user.role || "USER"
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
