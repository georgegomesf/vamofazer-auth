import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateVerificationCode } from "@/lib/tokens";
import { sendVerificationCodeEmail } from "@/lib/mail";
import { UserRole } from "@prisma/client";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email: rawEmail, projectId } = body;
        const email = rawEmail?.toLowerCase().trim();

        if (!email) {
            return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
        }

        // Garante que o usuário existe (Upsert) - igual ao fluxo de Magic Link do web
        const user = await prisma.user.upsert({
            where: { email },
            update: {}, // Não altera nada se já existir
            create: {
                email,
                name: email.split('@')[0],
                role: UserRole.VISITOR // Começa como visitante até verificar
            }
        });

        if (user.emailVerified) {
            return NextResponse.json({ error: "E-mail já verificado" }, { status: 400 });
        }

        const verificationToken = await generateVerificationCode(email);
        const emailResult = await sendVerificationCodeEmail(verificationToken.identifier, verificationToken.token, projectId);

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
