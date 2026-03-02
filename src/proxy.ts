import { auth } from "@/auth";

export default auth((req) => {
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
