import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

interface Props {
    searchParams: Promise<{ sessionId?: string }>;
}

export default async function MobileAuthCallbackPage({ searchParams }: Props) {
    const { sessionId } = await searchParams;

    if (!sessionId) {
        return (
            <div style={styles.container}>
                <h2 style={styles.error}>Erro: sessionId ausente.</h2>
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

        return (
            <div style={styles.container}>
                <svg style={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="12" fill="#22c55e" />
                    <path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2 style={styles.title}>Autenticação concluída!</h2>
                <p style={styles.sub}>Volte ao aplicativo. Esta janela pode ser fechada.</p>
            </div>
        );
    } catch (error) {
        console.error("MobileAuthCallback error:", error);
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
