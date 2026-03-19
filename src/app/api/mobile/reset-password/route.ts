import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("MOBILE RESET PASSWORD BODY:", body);
        
        let email = body.email;
        const code = body.code || body.token;
        const newPassword = body.newPassword || body.password;

        if (!code || !newPassword) {
            console.warn("MOBILE RESET PASSWORD: Missing required data", { code: !!code, newPassword: !!newPassword });
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        const existingToken = await prisma.passwordResetToken.findFirst({
            where: {
                token: code.toUpperCase(),
                ...(email ? { email } : {}) 
            }
        });

        if (!existingToken) {
            console.error("MOBILE RESET PASSWORD: Token not found", { code, email });
            return NextResponse.json({ error: "Código inválido" }, { status: 400 });
        }

        // Se o email não foi enviado no corpo, mas temos o token, usamos o email do token
        if (!email) email = existingToken.email;

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
