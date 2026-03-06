"use server";

import prisma from "@/lib/prisma";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail, sendGoogleAuthWarningEmail } from "@/lib/mail";

export async function resetPassword(formData: FormData) {
    const email = formData.get("email") as string;
    const callbackUrl = formData.get("callbackUrl") as string || "";

    if (!email) {
        return { error: "O e-mail é obrigatório" };
    }

    // Busca contexto do projeto
    let project = null;
    if (callbackUrl) {
        try {
            const cbUrl = new URL(callbackUrl);
            const host = cbUrl.host;
            const projectId = cbUrl.searchParams.get("projectId");
            // @ts-ignore
            project = await prisma.project.findFirst({
                where: {
                    OR: [
                        { id: projectId || undefined },
                        { link: { contains: host } }
                    ]
                }
            });
        } catch (e) { }
    }

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (!existingUser) {
        // Por segurança, não informamos se o e-mail existe, apenas dizemos que enviamos se existir
        return { success: "Se este e-mail estiver cadastrado, um link de recuperação foi enviado." };
    }

    if (!existingUser.password) {
        // Usuário existe mas não tem senha (entrou via Google)
        await sendGoogleAuthWarningEmail(email, project || undefined);
        return { success: "Instruções de acesso enviadas para o seu e-mail!" };
    }

    const passwordResetToken = await generatePasswordResetToken(email);
    await sendPasswordResetEmail(
        passwordResetToken.email,
        passwordResetToken.token,
        project || undefined
    );

    return { success: "Link de recuperação enviado para o seu e-mail!" };
}
