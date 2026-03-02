import { auth } from "@/auth";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
    try {
        const session = await auth();

        if (!session?.user) {
            // Se não tiver sessão (não logou), redireciona o mobile de volta passando erro
            return NextResponse.redirect("mob://auth?error=cancel");
        }

        const user = session.user;

        // Gera token para o mobile 
        const secret = process.env.AUTH_SECRET || "default_mobile_secret";
        const token = jwt.sign(
            // @ts-ignore
            { id: user.id, email: user.email, role: user.role, name: user.name },
            secret,
            { expiresIn: "7d" }
        );

        // Prepara os dados codificados em URI para enviar via deep link do expo
        const userData = encodeURIComponent(JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            // @ts-ignore
            role: user.role
        }));

        // Redireciona o WebBrowser de volta para o React Native / App
        return NextResponse.redirect(`mob://auth?token=${token}&user=${userData}`);

    } catch (error) {
        console.error("Mobile callback error:", error);
        return NextResponse.redirect("mob://auth?error=server_error");
    }
}
