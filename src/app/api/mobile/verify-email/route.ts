import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, code } = body;

        if (!email || !code) {
            return NextResponse.json({ error: "E-mail e código são obrigatórios" }, { status: 400 });
        }

        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                identifier: email,
                token: code.toUpperCase()
            }
        });

        if (!verificationToken) {
            return NextResponse.json({ error: "Código inválido ou expirado" }, { status: 400 });
        }

        const hasExpired = new Date(verificationToken.expires) < new Date();

        if (hasExpired) {
            await prisma.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: verificationToken.identifier,
                        token: verificationToken.token
                    }
                }
            });
            return NextResponse.json({ error: "Código expirado" }, { status: 400 });
        }

        // Marca o usuário como verificado
        await prisma.user.update({
            where: { email },
            data: { emailVerified: new Date() }
        });

        // Deleta o token
        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: verificationToken.identifier,
                    token: verificationToken.token
                }
            }
        });

        return NextResponse.json({ success: "E-mail verificado com sucesso!" });
    } catch (error) {
        console.error("Verify email error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
