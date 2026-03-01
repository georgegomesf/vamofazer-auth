import prisma from "@/lib/prisma";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail, sendGoogleAuthWarningEmail } from "@/lib/mail";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: "O e-mail é obrigatório" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (!existingUser) {
            // Por segurança, não informamos se o e-mail existe
            return NextResponse.json({ success: "Se este e-mail estiver cadastrado, um link de recuperação foi enviado." });
        }

        if (!existingUser.password) {
            // Usuário do Google
            await sendGoogleAuthWarningEmail(email);
            return NextResponse.json({ success: "Instruções enviadas para o seu e-mail!" });
        }

        const passwordResetToken = await generatePasswordResetToken(email);
        await sendPasswordResetEmail(
            passwordResetToken.email,
            passwordResetToken.token
        );

        return NextResponse.json({ success: "Link de recuperação enviado!" });
    } catch (error) {
        console.error("Reset mobile error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
