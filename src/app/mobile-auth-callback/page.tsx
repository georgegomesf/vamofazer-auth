import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export default async function MobileAuthCallbackPage() {
    // Lê o sessionId do cookie que foi salvo antes do OAuth iniciar
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('mobile_session_id')?.value;

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
            { id: user.id, email: user.email, role: user.role, name: user.name },
            secret,
            { expiresIn: "7d" }
        );

        const userData = JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            // @ts-ignore
            role: user.role,
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

        // Remove o cookie após usar (Comentado pois Pages não podem deletar cookies)
        // cookieStore.delete('mobile_session_id');

        return (
            <div style={styles.container}>
                <svg style={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="12" fill="#22c55e" />
                    <path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2 style={styles.title}>Autenticação concluída!</h2>
                <p style={styles.sub}>Volte ao aplicativo. Esta janela fechará automaticamente...</p>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `setTimeout(() => { window.close(); }, 2000);`
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
        fontFamily: "sans-serif",
        backgroundColor: "#fafafa",
        padding: "20px",
        textAlign: "center",
    },
    icon: {
        width: 64,
        height: 64,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#111",
        marginBottom: 8,
    },
    error: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#dc2626",
        marginBottom: 8,
    },
    sub: {
        fontSize: 16,
        color: "#555",
    },
};
