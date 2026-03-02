import { auth } from "@/auth";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
    try {
        const session = await auth();

        if (!session?.user) {
            // Redireciona via JS para fechar a aba no Expo sem token
            return new NextResponse(buildHtmlRedirect("mob://auth?error=cancel"), {
                headers: { "Content-Type": "text/html" },
            });
        }

        const user = session.user;

        // Gera token JWT para o mobile
        const secret = process.env.AUTH_SECRET || "default_mobile_secret";
        const token = jwt.sign(
            // @ts-ignore
            { id: user.id, email: user.email, role: user.role, name: user.name },
            secret,
            { expiresIn: "7d" }
        );

        // Prepara os dados do usuário codificados
        const userData = encodeURIComponent(JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            // @ts-ignore
            role: user.role
        }));

        // Redireciona via JS (mais confiável em Chrome Custom Tabs no Android)
        const deepLink = `mob://auth?token=${token}&user=${userData}`;
        return new NextResponse(buildHtmlRedirect(deepLink), {
            headers: { "Content-Type": "text/html" },
        });

    } catch (error) {
        console.error("Mobile callback error:", error);
        return new NextResponse(buildHtmlRedirect("mob://auth?error=server_error"), {
            headers: { "Content-Type": "text/html" },
        });
    }
}

function buildHtmlRedirect(deepLink: string): string {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Redirecionando...</title>
    <script>
      window.onload = function() {
        window.location.href = "${deepLink}";
      };
    </script>
  </head>
  <body>
    <p>Redirecionando de volta ao aplicativo...</p>
    <p>Se o app não abrir automaticamente, <a href="${deepLink}">clique aqui</a>.</p>
  </body>
</html>`;
}
