import { signIn } from "@/auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || '';

    // Salva o sessionId num cookie antes de redirecionar para o OAuth
    // O cookie persiste durante todo o fluxo do Google e é lido no callback
    const cookieStore = await cookies();
    cookieStore.set('mobile_session_id', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 5, // 5 minutos
        path: '/',
    });

    // Inicia o fluxo OAuth do Google. O redirectTo não precisa mais do sessionId na URL
    await signIn("google", {
        redirectTo: `/mobile-auth-callback`,
    });
}
