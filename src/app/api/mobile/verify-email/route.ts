import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

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
        const user = await prisma.user.update({
            where: { email },
            data: {
                emailVerified: new Date(),
                role: 'USER' // Promoção automática se for visitante
            }
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

        // Gera JWT para o mobile
        const secret = process.env.AUTH_SECRET || "default_mobile_secret";
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            secret,
            { expiresIn: "7d" }
        );

        return NextResponse.json({
            success: "E-mail verificado com sucesso!",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Verify email error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
