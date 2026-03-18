import prisma from "@/lib/prisma";
import { generatePasswordResetCode } from "@/lib/tokens";
import { sendPasswordResetCodeEmail, sendGoogleAuthWarningEmail } from "@/lib/mail";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, projectId } = body;

        if (!email) {
            return NextResponse.json({ error: "O e-mail é obrigatório" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (!existingUser) {
            // Por segurança, não informamos se o e-mail existe
            return NextResponse.json({ success: "Se este e-mail estiver cadastrado, um código de recuperação foi enviado." });
        }

        if (!existingUser.password) {
            // Usuário do Google
            await sendGoogleAuthWarningEmail(email, projectId);
            return NextResponse.json({ success: "Instruções enviadas para o seu e-mail!" });
        }

        const passwordResetToken = await generatePasswordResetCode(email);
        await sendPasswordResetCodeEmail(
            passwordResetToken.email,
            passwordResetToken.token,
            projectId
        );

        return NextResponse.json({ success: "Código de recuperação enviado!" });
    } catch (error) {
        console.error("Reset mobile error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
