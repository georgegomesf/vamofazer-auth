import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || user.role === "BLOCKED") {
            return NextResponse.json({ error: "Credenciais inválidas ou usuário bloqueado" }, { status: 401 });
        }

        if (!user.emailVerified) {
            return NextResponse.json({
                error: "E-mail não verificado",
                needsVerification: true,
                email: user.email
            }, { status: 403 });
        }

        if (!user.password) {
            return NextResponse.json({ error: "Faça login com sua conta do Google" }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
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
                image: user.image,
                role: user.role,
                projectRole: projectRole
            }
        });
    } catch (error) {
        console.error("Login mobile error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
