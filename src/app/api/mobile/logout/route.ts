import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    const cookieStore = await cookies();

    // Lista de cookies comuns do NextAuth que devem ser limpos
    const cookiesToClear = [
        "authjs.session-token",
        "__Secure-authjs.session-token",
        "authjs.callback-url",
        "authjs.csrf-token",
        "authjs.pkce.code_verifier",
        "authjs.state"
    ];

    cookiesToClear.forEach(cookieName => {
        cookieStore.set(cookieName, "", {
            maxAge: 0,
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "lax"
        });
    });

    return NextResponse.json({ success: true });
}
