import { auth } from "@/auth";

export default auth(async (req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    const isAuthRoute = nextUrl.pathname.startsWith("/auth");

    if (isAuthRoute) {
        if (isLoggedIn) {
            const callbackUrl = nextUrl.searchParams.get("callbackUrl");
            console.log(`AUTH PROXY: User already logged in on auth route. redirecting to ${callbackUrl || "/"}`);
            if (callbackUrl) {
                try {
                    const url = new URL(callbackUrl);

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

                            url.searchParams.set("st", token);
                            console.log("AUTH PROXY: Token appended successfully");
                        } catch (err) {
                            console.error("AUTH PROXY: Failed to create transfer token:", err);
                        }
                    }

                    return Response.redirect(url.toString());
                } catch (e) {
                    console.error("AUTH PROXY: Invalid callbackUrl:", callbackUrl);
                }
            }
            return Response.redirect(new URL("/", nextUrl).toString());
        }
        return;
    }

    return;
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
