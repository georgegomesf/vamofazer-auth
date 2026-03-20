import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export default async function MobileAuthCallbackPage({ searchParams }: { searchParams: Promise<{ sessionId?: string }> }) {
    // Lê o sessionId do cookie ou da query string (fallback para quando o browser se destrói)
    const cookieStore = await cookies();
    const resolvedParams = await searchParams;
    const sessionId = resolvedParams.sessionId || cookieStore.get('mobile_session_id')?.value;

    if (!sessionId) {
        return (
            <div style={styles.container}>
                <h2 style={styles.error}>Erro: sessão não identificada.</h2>
                <p style={styles.sub}>Tente fazer login novamente pelo aplicativo.</p>
            </div>
        );
    }

    const session = await auth();

    if (!session?.user) {
        // Registra o erro para o mobile saber que falhou
        await prisma.mobileAuthSession.upsert({
            where: { sessionId },
            create: { sessionId, error: "auth_not_concluded", expires: new Date(Date.now() + 2 * 60 * 1000) },
            update: { error: "auth_not_concluded", expires: new Date(Date.now() + 2 * 60 * 1000) }
        });

        return (
            <div style={styles.container}>
                <h2 style={styles.error}>Autenticação não concluída.</h2>
                <p style={styles.sub}>Volte ao aplicativo e tente novamente.</p>
            </div>
        );
    }

    const user = session.user;

    try {
        // Gera JWT para o mobile
        const secret = process.env.AUTH_SECRET || "default_mobile_secret";
        const token = jwt.sign(
            // @ts-ignore
            { id: user.id, email: user.email, role: user.role, name: user.name, projectRole: user.projectRole },
            secret,
            { expiresIn: "7d" }
        );

        const userData = JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            // @ts-ignore
            role: user.role,
            // @ts-ignore
            projectRole: user.projectRole
        });

        // Salva no banco com expiração de 5 minutos
        await prisma.mobileAuthSession.upsert({
            where: { sessionId },
            create: {
                sessionId,
                token,
                userData,
                expires: new Date(Date.now() + 5 * 60 * 1000),
            },
            update: {
                token,
                userData,
                expires: new Date(Date.now() + 5 * 60 * 1000),
            },
        });

        // Lê o redirectUri do cookie
        const redirectUrl = cookieStore.get('mobile_redirect_uri')?.value || 'mob://auth';

        // Remove o cookie após usar (Comentado pois Pages não podem deletar cookies)
        // cookieStore.delete('mobile_session_id');

        return (
            <div style={styles.container}>
                {/* Fallback de redirecionamento imediato via Meta Tag */}
                <meta httpEquiv="refresh" content={`2;url=${redirectUrl}`} />

                <div style={styles.card}>
                    <div style={styles.successCircle}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>

                    <h2 style={styles.title}>Sucesso!</h2>
                    <p style={styles.sub}>
                        Autenticação realizada com sucesso. <br />
                        Estamos redirecionando você de volta...
                    </p>

                    <div style={styles.divider}></div>

                    <a
                        href={redirectUrl}
                        style={styles.button}
                        id="redirect-link"
                    >
                        Continuar no Aplicativo
                    </a>

                    <p style={styles.footer}>
                        Se não for redirecionado em instantes, clique no botão acima.
                    </p>
                </div>

                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            const link = document.getElementById('redirect-link');
                            const redirectUrl = "${redirectUrl}";
                            
                            function tryRedirect() {
                                // Tenta abrir o app. Em muitos sistemas, isso fecha o browser ou troca o foco.
                                window.location.href = redirectUrl;
                                
                                // Tenta fechar a aba se for possível
                                setTimeout(() => {
                                    window.close();
                                }, 1000);
                            }

                            // Tenta imediatamente e após pequenos delays
                            tryRedirect();
                            setTimeout(tryRedirect, 1000);
                            setTimeout(tryRedirect, 3000);
                            setTimeout(tryRedirect, 5000);
                        `
                    }}
                />
            </div>
        );
    } catch (error: any) {
        console.error("MobileAuthCallback error details:", {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        });
        return (
            <div style={styles.container}>
                <h2 style={styles.error}>Erro ao salvar sessão.</h2>
                <p style={styles.sub}>Tente novamente pelo aplicativo.</p>
            </div>
        );
    }
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "20px",
        backgroundColor: "#050505",
        fontFamily: "Inter, system-ui, sans-serif",
    },
    card: {
        width: "100%",
        maxWidth: "400px",
        backgroundColor: "#111",
        borderRadius: "24px",
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        border: "1px solid #222",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    },
    successCircle: {
        width: "80px",
        height: "80px",
        borderRadius: "40px",
        backgroundColor: "#22c55e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "24px",
    },
    title: {
        fontSize: "24px",
        fontWeight: "bold",
        color: "#fff",
        margin: "0 0 12px 0",
    },
    sub: {
        fontSize: "16px",
        color: "#a1a1aa",
        margin: "0",
        lineHeight: "1.5",
        textAlign: "center",
    },
    divider: {
        width: "100%",
        height: "1px",
        backgroundColor: "#222",
        margin: "32px 0",
    },
    button: {
        width: "100%",
        backgroundColor: "#fff",
        color: "#000",
        padding: "16px",
        borderRadius: "12px",
        fontWeight: "bold",
        fontSize: "16px",
        textDecoration: "none",
        textAlign: "center",
        transition: "opacity 0.2s",
    },
    footer: {
        fontSize: "12px",
        color: "#52525b",
        marginTop: "16px",
        margin: "16px 0 0 0",
    },
    error: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#ef4444",
        marginBottom: 8,
    },
};
