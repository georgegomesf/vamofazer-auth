import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { generateVerificationCode } from "@/lib/tokens";
import { sendVerificationCodeEmail } from "@/lib/mail";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email: rawEmail, password, projectId, callbackUrl, environment } = body;
        const email = rawEmail?.toLowerCase().trim();

        if (!email || !password) {
            return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name: name || "",
                email,
                password: hashedPassword,
                role: UserRole.VISITOR,
                emailVerified: null, // Garante que comece nulo
            },
        });

        if (projectId) {
            const projectToJoin = await prisma.project.findUnique({ where: { id: projectId } });
            if (projectToJoin) {
                await prisma.userProject.create({
                    data: {
                        userId: user.id,
                        projectId: projectToJoin.id,
                        role: projectToJoin.defaultEntryRole || 'visitor'
                    }
                });
            }
        }


        if (environment === 'web') {
            const { signIn } = await import("@/auth");
            
            let enrichedCallback = callbackUrl || "/";
            
            if (enrichedCallback.startsWith("/") && projectId) {
                const projectForLink = await prisma.project.findUnique({ where: { id: projectId } });
                if (projectForLink && projectForLink.link) {
                    const linkHost = projectForLink.link.startsWith("http") ? projectForLink.link : `https://${projectForLink.link}`;
                    const cleanedHost = linkHost.endsWith("/") ? linkHost.slice(0, -1) : linkHost;
                    enrichedCallback = `${cleanedHost}${enrichedCallback}`;
                }
            }

            if (projectId) {
                enrichedCallback = enrichedCallback.includes("?") 
                    ? `${enrichedCallback}&projectId=${projectId}`
                    : `${enrichedCallback}?projectId=${projectId}`;
            }
            
            const finalCallbackUrl = `/auth/signin?callbackUrl=${encodeURIComponent(enrichedCallback)}`;
            
            try {
                await signIn("email", {
                    email,
                    redirectTo: finalCallbackUrl,
                    redirect: false
                });
            } catch (error) {
                // Ignora erro de redirect do Next.js se houver
            }

            return NextResponse.json({
                success: "Conta criada! Verifique seu e-mail para confirmar seu cadastro.",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        }

        // Gera e envia o código de verificação
        const verificationToken = await generateVerificationCode(email);
        const emailResult = await sendVerificationCodeEmail(verificationToken.identifier, verificationToken.token, projectId);

        if (emailResult.error) {
            console.error("Failed to send verification email:", emailResult.error);
            return NextResponse.json({ error: "Conta criada, mas erro ao enviar e-mail de verificação." }, { status: 500 });
        }

        return NextResponse.json({
            success: "Conta criada! Verifique seu e-mail para o código de ativação.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
