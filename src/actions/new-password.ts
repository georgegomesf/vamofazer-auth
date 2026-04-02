"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getWallClockNow } from "@/lib/date-utils";

export async function updatePassword(formData: FormData, token: string | null) {
    if (!token) {
        return { error: "Token ausente" };
    }

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || password.length < 6) {
        return { error: "A senha deve ter pelo menos 6 caracteres" };
    }

    if (password !== confirmPassword) {
        return { error: "As senhas não coincidem" };
    }

    const existingToken = await prisma.passwordResetToken.findUnique({
        where: { token }
    });

    if (!existingToken) {
        return { error: "Token inválido" };
    }

    const hasExpired = new Date(existingToken.expires) < getWallClockNow();

    if (hasExpired) {
        return { error: "O token expirou" };
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: existingToken.email }
    });

    if (!existingUser) {
        return { error: "O e-mail não existe" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword }
    });

    await prisma.passwordResetToken.delete({
        where: { id: existingToken.id }
    });

    return { success: "Senha atualizada com sucesso!" };
}
