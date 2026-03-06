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
                    if (!callbackUrl.includes(currentHost) && req.auth?.user) {
                        const { SignJWT } = await import("jose");
                        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
                        const token = await new SignJWT({
                            id: req.auth.user.id,
                            email: req.auth.user.email,
                            name: req.auth.user.name,
                            // @ts-ignore
                            role: req.auth.user.role
                        })
                            .setProtectedHeader({ alg: "HS256" })
                            .setExpirationTime("2m")
                            .sign(secret);

                        url.searchParams.set("st", token);
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
