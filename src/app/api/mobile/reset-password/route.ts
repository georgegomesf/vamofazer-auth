import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, code, newPassword } = body;

        if (!email || !code || !newPassword) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        const existingToken = await prisma.passwordResetToken.findFirst({
            where: {
                email,
                token: code.toUpperCase()
            }
        });

        if (!existingToken) {
            return NextResponse.json({ error: "Código inválido" }, { status: 400 });
        }

        const hasExpired = new Date(existingToken.expires) < new Date();

        if (hasExpired) {
            await prisma.passwordResetToken.delete({
                where: { id: existingToken.id }
            });
            return NextResponse.json({ error: "O código expirou" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        await prisma.passwordResetToken.delete({
            where: { id: existingToken.id }
        });

        return NextResponse.json({ success: "Senha redefinida com sucesso!" });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
