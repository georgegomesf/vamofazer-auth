"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { signIn } from "@/auth";

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

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
            redirectTo: "/auth/signin?verified=true",
            redirect: false
        });

        return {
            success: "Conta criada! Verifique seu e-mail para confirmar seu cadastro.",
            user
        };
    } catch (error) {
        console.error("Registration error:", error);
        return { error: "Something went wrong" };
    }
}
