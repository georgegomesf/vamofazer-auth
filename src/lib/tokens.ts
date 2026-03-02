import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";

export const generatePasswordResetToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hora de validade

    const existingToken = await prisma.passwordResetToken.findFirst({
        where: { email }
    });

    if (existingToken) {
        await prisma.passwordResetToken.delete({
            where: { id: existingToken.id }
        });
    }

    const passwordResetToken = await prisma.passwordResetToken.create({
        data: {
            email,
            token,
            expires
        }
    });

    return passwordResetToken;
};

export const generatePasswordResetCode = async (email: string) => {
    // Gera código de 6 caracteres alfanuméricos
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Evitando O, 0, I, 1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const expires = new Date(new Date().getTime() + 15 * 60 * 1000); // 15 minutos de validade

    const existingToken = await prisma.passwordResetToken.findFirst({
        where: { email }
    });

    if (existingToken) {
        await prisma.passwordResetToken.delete({
            where: { id: existingToken.id }
        });
    }

    const passwordResetToken = await prisma.passwordResetToken.create({
        data: {
            email,
            token: code,
            expires
        }
    });

    return passwordResetToken;
};
