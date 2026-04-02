import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getWallClockNow } from "@/lib/date-utils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, code } = body;

        if (!email || !code) {
            return NextResponse.json({ error: "E-mail e código são obrigatórios" }, { status: 400 });
        }

        const existingToken = await prisma.passwordResetToken.findFirst({
            where: {
                email,
                token: code.toUpperCase()
            }
        });

        if (!existingToken) {
            return NextResponse.json({ error: "Código inválido ou não encontrado" }, { status: 400 });
        }

        const hasExpired = new Date(existingToken.expires) < getWallClockNow();

        if (hasExpired) {
            await prisma.passwordResetToken.delete({
                where: { id: existingToken.id }
            });
            return NextResponse.json({ error: "O código expirou" }, { status: 400 });
        }

        return NextResponse.json({ success: "Código válido", token: existingToken.token });
    } catch (error) {
        console.error("Reset verify error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
