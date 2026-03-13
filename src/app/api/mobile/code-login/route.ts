import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accessCode } = body;

        if (!accessCode) {
            return NextResponse.json({ error: "O código de acesso é obrigatório" }, { status: 400 });
        }

        // Busca o vínculo código-atividade usando o Prisma (assumindo que o banco é compartilhado)
        const userActivity = await prisma.userActivity.findUnique({
            where: { accessCode },
            include: {
                user: true,
                activity: true
            }
        });

        if (!userActivity) {
            return NextResponse.json({ error: "Código inválido" }, { status: 401 });
        }

        const user = userActivity.user;

        // Atualiza status se necessário
        if (!user.emailVerified || userActivity.role === 'INVITED') {
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: user.id },
                    data: { emailVerified: user.emailVerified ? undefined : new Date() }
                }),
                prisma.userActivity.update({
                    where: {
                        userId_activityId: {
                            userId: user.id,
                            activityId: userActivity.activityId
                        }
                    },
                    data: { role: 'PARTICIPANT' }
                })
            ]);
        }

        // Gerar Token JWT Mobile
        const secret = process.env.AUTH_SECRET || "default_mobile_secret";
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name, activityId: userActivity.activityId },
            secret,
            { expiresIn: "7d" }
        );

        return NextResponse.json({
            success: "Login via código realizado com sucesso",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                activityId: userActivity.activityId
            }
        });

    } catch (error) {
        console.error("Code login mobile error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
