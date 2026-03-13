import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    return handleLogout(request);
}

export async function GET(request: Request) {
    return handleLogout(request);
}

async function handleLogout(request: Request) {
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get('redirectUri');
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

    if (redirectUri && (redirectUri.startsWith('mob://') || redirectUri.startsWith('vamofazer://'))) {
        return new NextResponse(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Saindo...</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { background: #050505; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
                        .card { background: #111; padding: 40px; border-radius: 24px; border: 1px solid #222; text-align: center; max-width: 300px; width: 90%; }
                        .spinner { width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        p { color: #a1a1aa; margin: 0; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="spinner"></div>
                        <p>Desconectando sua conta...</p>
                    </div>
                    <script>
                        const redirectUrl = "${redirectUri}";
                        function doRedirect() {
                            window.location.href = redirectUrl;
                            setTimeout(() => window.close(), 1000);
                        }
                        doRedirect();
                        setTimeout(doRedirect, 1000);
                        setTimeout(doRedirect, 3000);
                    </script>
                </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });
    }

    return NextResponse.json({ success: true });
}
