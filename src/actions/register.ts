"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { signIn } from "@/auth";
import { headers } from "next/headers";

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const callbackUrl = formData.get("callbackUrl") as string || "/";

    let originalCallback = callbackUrl;
    try {
        // Se o callbackUrl for uma URL do auth (localhost:3002), tenta extrair o verdadeiro callback de dentro dela
        if (callbackUrl.includes("callbackUrl=")) {
            const urlObj = new URL(callbackUrl);
            const innerCallback = urlObj.searchParams.get("callbackUrl");
            if (innerCallback) originalCallback = innerCallback;
        }
    } catch (e) { }

    if (!email || !password) {
        return { error: "E-mail e senha são obrigatórios" };
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return { error: "Email já cadastrado" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Detecta o contexto do projeto para o e-mail
    let projectId = "";
    let projectName = "VamoFazer";

    try {
        let host = "";

        if (originalCallback.startsWith("http")) {
            host = new URL(originalCallback).host;
        } else {
            const headerList = await headers();
            host = headerList.get("host") || "";
        }

        if (host) {
            // @ts-ignore
            const project = await prisma.project.findFirst({
                where: { link: { contains: host } }
            });
            if (project) {
                projectId = project.id;
                projectName = project.name;
            } else if (host.includes("localhost:3004") || originalCallback.includes("localhost:3004")) {
                projectName = "Myrvia & George";
            }
        }
    } catch (e) { }

    // Garante que o projectId vá na query para o e-mail sender encontrar
    const enrichedCallback = projectId
        ? (originalCallback.includes("?")
            ? `${originalCallback}&projectId=${projectId}`
            : `${originalCallback}?projectId=${projectId}`)
        : originalCallback;

    // Adiciona o pulo (hop) pelo @auth para garantir a transferência de sessão via middleware
    const finalCallbackUrl = `/auth/signin?callbackUrl=${encodeURIComponent(enrichedCallback)}`;

    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: UserRole.VISITOR,
            },
        });

        // Dispara o envio do link de confirmação (Magic Link) via provedor de Email
        await signIn("email", {
            email,
            callbackUrl: finalCallbackUrl,
            redirect: false
        });

        return {
            success: `Conta criada no ${projectName}! Verifique seu e-mail para confirmar seu cadastro.`,
            user
        };
    } catch (error) {
        console.error("Registration error:", error);
        return { error: "Erro ao criar conta. Tente novamente." };
    }
}
