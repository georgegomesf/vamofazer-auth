"use server";

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function prepareMagicLinkUser(email: string) {
    if (!email) {
        return { error: "O e-mail é obrigatório" };
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        // Só preenchemos o nome se ele ainda não existir
        if (!existingUser || !existingUser.name) {
            const now = new Date();
            const dateStr = now.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            const defaultName = email.split('@')[0];

            await prisma.user.upsert({
                where: { email },
                update: {
                    name: existingUser?.name || defaultName
                },
                create: {
                    email,
                    name: defaultName,
                    role: UserRole.VISITOR
                }
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error preparing magic link user:", error);
        return { error: "Erro ao processar solicitação" };
    }
}
