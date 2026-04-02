import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getWallClockNow } from "@/lib/date-utils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, name, googleId } = body;

        if (!email || !googleId) {
            return NextResponse.json({ error: "E-mail e ID do Google são obrigatórios" }, { status: 400 });
        }

        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (user && user.role === "BLOCKED") {
            return NextResponse.json({ error: "Usuário bloqueado" }, { status: 401 });
        }

        if (!user) {
            // First time login via google creates user
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    role: "USER",
                    emailVerified: getWallClockNow()
                }
            });
        } else if (user.role === "VISITOR" || !user.emailVerified) {
            // Upgrade role if needed
            user = await prisma.user.update({
                where: { email },
                data: {
                    role: "USER",
                    emailVerified: getWallClockNow()
                }
            })
        }

        let projectRole = null;
        if (body.projectId) {
            let userProject = await prisma.userProject.findFirst({
                where: { userId: user.id, projectId: body.projectId }
            });

            if (!userProject) {
                const projectToJoin = await prisma.project.findUnique({ where: { id: body.projectId } });
                if (projectToJoin) {
                    userProject = await prisma.userProject.create({
                        data: {
                            userId: user.id,
                            projectId: projectToJoin.id,
                            role: projectToJoin.defaultEntryRole || 'member'
                        }
                    });
                }
            }
            projectRole = userProject?.role;
        }

        // Generate JWT token for mobile app
        const secret = process.env.AUTH_SECRET || "default_mobile_secret";
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name, projectRole: projectRole },
            secret,
            { expiresIn: "7d" }
        );

        return NextResponse.json({
            success: "Login realizado com sucesso",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                projectRole: projectRole
            }
        });

    } catch (error) {
        console.error("Google mobile auth error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
