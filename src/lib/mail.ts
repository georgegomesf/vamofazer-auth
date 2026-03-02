export const sendPasswordResetEmail = async (email: string, token: string) => {
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/new-password?token=${token}`;

    const res = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY as string,
            'content-type': 'application/json',
            'accept': 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: "VamoFazer",
                email: process.env.EMAIL_FROM
            },
            to: [{ email }],
            subject: "Recuperação de Senha - VamoFazer",
            htmlContent: `
                <div style="background: #050505; color: white; padding: 40px; font-family: sans-serif; border-radius: 24px; border: 1px solid #27272a; max-width: 600px; margin: auto;">
                    <div style="margin-bottom: 30px; text-align: center;">
                        <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">VamoFazer</h1>
                    </div>
                    <h2 style="color: white; text-align: center;">Recuperação de Senha</h2>
                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; text-align: center;">
                        Você solicitou a alteração da sua senha. Clique no botão abaixo para definir uma nova senha para sua conta.
                    </p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${resetLink}" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">Redefinir Senha</a>
                    </div>
                    <p style="font-size: 12px; color: #52525b; text-align: center; margin-top: 40px;">
                        Este link expira em 1 hora. Se você não solicitou esta alteração, pode ignorar este e-mail.
                    </p>
                </div>
            `
        })
    });

    if (!res.ok) {
        return { error: "Erro ao enviar e-mail" };
    }

    return { success: true };
};

export const sendPasswordResetCodeEmail = async (email: string, code: string) => {
    const res = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY as string,
            'content-type': 'application/json',
            'accept': 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: "VamoFazer",
                email: process.env.EMAIL_FROM
            },
            to: [{ email }],
            subject: "Código de Recuperação - VamoFazer",
            htmlContent: `
                <div style="background: #050505; color: white; padding: 40px; font-family: sans-serif; border-radius: 24px; border: 1px solid #27272a; max-width: 600px; margin: auto;">
                    <div style="margin-bottom: 30px; text-align: center;">
                        <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">VamoFazer</h1>
                    </div>
                    <h2 style="color: white; text-align: center;">Código de Recuperação</h2>
                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; text-align: center;">
                        Use o código abaixo para redefinir sua senha no aplicativo.
                    </p>
                    <div style="text-align: center; margin: 40px 0;">
                        <div style="background: #18181b; color: #3b82f6; padding: 24px; border-radius: 16px; font-weight: bold; font-size: 32px; display: inline-block; letter-spacing: 8px; border: 1px solid #27272a;">
                            ${code}
                        </div>
                    </div>
                    <p style="font-size: 12px; color: #52525b; text-align: center; margin-top: 40px;">
                        Este código expira em 15 minutos. Se você não solicitou esta alteração, pode ignorar este e-mail.
                    </p>
                </div>
            `
        })
    });

    if (!res.ok) {
        return { error: "Erro ao enviar e-mail" };
    }

    return { success: true };
};

export const sendGoogleAuthWarningEmail = async (email: string) => {
    // ... existing code ...
    const res = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY as string,
            'content-type': 'application/json',
            'accept': 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: "VamoFazer",
                email: process.env.EMAIL_FROM
            },
            to: [{ email }],
            subject: "Aviso de Segurança - VamoFazer",
            htmlContent: `
                <div style="background: #050505; color: white; padding: 40px; font-family: sans-serif; border-radius: 24px; border: 1px solid #27272a; max-width: 600px; margin: auto;">
                    <div style="margin-bottom: 30px; text-align: center;">
                        <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">VamoFazer</h1>
                    </div>
                    <h2 style="color: white; text-align: center;">Tentativa de Recuperação de Senha</h2>
                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; text-align: center;">
                        Identificamos uma solicitação de recuperação de senha para sua conta. No entanto, sua conta está configurada para acesso exclusivo via <strong>Google</strong>.
                    </p>
                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; text-align: center; margin-top: 20px;">
                        Por medida de segurança, não é possível definir uma senha manual. Por favor, utilize o botão "Entrar com Google" na nossa tela de login.
                    </p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${process.env.NEXTAUTH_URL}/auth/signin" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">Ir para o Login</a>
                    </div>
                    <p style="font-size: 12px; color: #52525b; text-align: center; margin-top: 40px;">
                        Se você não reconhece esta tentativa, nenhuma ação é necessária, já que seu método de login por e-mail/senha permanece desativado.
                    </p>
                </div>
            `
        })
    });

    return { success: res.ok };
};

export const sendVerificationCodeEmail = async (email: string, code: string) => {
    const res = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY as string,
            'content-type': 'application/json',
            'accept': 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: "VamoFazer",
                email: process.env.EMAIL_FROM
            },
            to: [{ email }],
            subject: "Código de Verificação - VamoFazer",
            htmlContent: `
                <div style="background: #050505; color: white; padding: 40px; font-family: sans-serif; border-radius: 24px; border: 1px solid #27272a; max-width: 600px; margin: auto;">
                    <div style="margin-bottom: 30px; text-align: center;">
                        <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">VamoFazer</h1>
                    </div>
                    <h2 style="color: white; text-align: center;">Verificação de Conta</h2>
                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; text-align: center;">
                        Parabéns por se cadastrar no VamoFazer! Use o código abaixo para confirmar seu e-mail e ativar sua conta.
                    </p>
                    <div style="text-align: center; margin: 40px 0;">
                        <div style="background: #18181b; color: #3b82f6; padding: 24px; border-radius: 16px; font-weight: bold; font-size: 32px; display: inline-block; letter-spacing: 8px; border: 1px solid #27272a;">
                            ${code}
                        </div>
                    </div>
                    <p style="font-size: 12px; color: #52525b; text-align: center; margin-top: 40px;">
                        Este código expira em 15 minutos. Se você não solicitou este cadastro, pode ignorar este e-mail.
                    </p>
                </div>
            `
        })
    });

    if (!res.ok) {
        return { error: "Erro ao enviar e-mail" };
    }

    return { success: true };
};
