import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getWallClockNow } from "@/lib/date-utils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("MOBILE RESET PASSWORD BODY:", body);
        
        let email = body.email?.toLowerCase().trim();
        const rawCode = body.code || body.token;
        const newPassword = body.newPassword || body.password;

        if (!rawCode || !newPassword) {
            console.warn("MOBILE RESET PASSWORD: Missing required data", { code: !!rawCode, newPassword: !!newPassword });
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        // Limpa o código (remove espaços e garante maiúsculas para códigos de 6 caracteres)
        const code = rawCode.trim().replace(/\s/g, "");
        const finalToken = code.length === 6 ? code.toUpperCase() : code;

        const existingToken = await prisma.passwordResetToken.findFirst({
            where: {
                token: finalToken,
                ...(email ? { email } : {}) 
            }
        });

        if (!existingToken) {
            console.error("MOBILE RESET PASSWORD: Token not found in DB", { code: finalToken, email });
            // Debug: Se falhou com email, verifica se o código existe para algum e-mail
            const anyToken = await prisma.passwordResetToken.findUnique({
                where: { token: finalToken }
            });
            if (anyToken) {
                console.warn("MOBILE RESET PASSWORD: Token found but email mismatch!", {
                    tokenEmail: anyToken.email,
                    requestEmail: email
                });
            }
            return NextResponse.json({ error: "Código inválido" }, { status: 400 });
        }

        // Se o email não foi enviado no corpo, mas temos o token, usamos o email do token
        if (!email) email = existingToken.email;

        const hasExpired = new Date(existingToken.expires) < getWallClockNow();

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
