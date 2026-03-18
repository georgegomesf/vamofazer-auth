import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    });
}

export async function POST(request: Request) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
    try {
        const body = await request.json();
        const { email: rawEmail, callbackUrl, projectId } = body;
        const email = rawEmail?.toLowerCase().trim();
        console.log(`MAGIC LINK REQUEST: email=${email}, projectId=${projectId}`);

        if (!email) {
            return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400, headers: corsHeaders });
        }

        // Tenta encontrar ou criar o usuário (comportamento padrão do Magic Link)
        // Isso garante que o usuário já exista e possa ser associado ao projeto antes do NextAuth disparar o e-mail
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                name: email.split('@')[0],
                role: "VISITOR"
            }
        });

        // Associa ao projeto se o projectId for fornecido e ele não fizer parte ainda
        if (projectId) {
            const projectToJoin = await prisma.project.findUnique({ where: { id: projectId } });
            
            if (projectToJoin) {
                const hasProject = await prisma.userProject.findFirst({
                    where: { userId: user.id, projectId: projectId }
                });

                if (!hasProject) {
                    await prisma.userProject.upsert({
                        where: {
                            userId_projectId: {
                                userId: user.id,
                                projectId: projectToJoin.id
                            }
                        },
                        create: {
                            userId: user.id,
                            projectId: projectToJoin.id,
                            role: projectToJoin.defaultEntryRole || 'visitor'
                        },
                        update: {}
                    });
                }
            }
        }

        const { signIn } = await import("@/auth");
        
        let enrichedCallback = callbackUrl || "/";
            
        // Se o callbackUrl for relativo, tenta torná-lo absoluto usando o projeto
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

            return NextResponse.json({ success: "Link de acesso enviado!" }, { headers: corsHeaders });
        } catch (error: any) {
            console.error("Magic Link error:", error);
            return NextResponse.json({ error: "Erro ao processar login." }, { status: 500, headers: corsHeaders });
        }
    } catch (error) {
        console.error("Magic Link API error:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500, headers: corsHeaders });
    }
}
