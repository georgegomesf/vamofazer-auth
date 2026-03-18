import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateVerificationCode } from "@/lib/tokens";
import { sendVerificationCodeEmail } from "@/lib/mail";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // Por segurança, não informamos se o usuário existe
            return NextResponse.json({ success: "Se este e-mail for válido, um novo código foi enviado." });
        }

        if (user.emailVerified) {
            return NextResponse.json({ error: "E-mail já verificado" }, { status: 400 });
        }

        const verificationToken = await generateVerificationCode(email);
        const emailResult = await sendVerificationCodeEmail(verificationToken.identifier, verificationToken.token);

        if (emailResult.error) {
            console.error("Failed to send verification email:", emailResult.error);
            return NextResponse.json({ error: "Erro ao enviar e-mail de verificação" }, { status: 500 });
        }

        return NextResponse.json({ success: "Novo código enviado!" });
    } catch (error) {
        console.error("Resend verification error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
