import { signIn } from "@/auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || '';
    const redirectUri = searchParams.get('redirectUri') || 'mob://auth';

    // Salva o sessionId e redirectUri num cookie antes de redirecionar para o OAuth
    const cookieStore = await cookies();
    cookieStore.set('mobile_session_id', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 5, // 5 minutos
        path: '/',
    });
    cookieStore.set('mobile_redirect_uri', redirectUri, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 5,
        path: '/',
    });

    // Limpa a sessão anterior do navegador para garantir um novo login limpo
    cookieStore.set('authjs.session-token', '', {
        maxAge: 0,
        path: '/',
    });
    cookieStore.set('__Secure-authjs.session-token', '', {
        maxAge: 0,
        path: '/',
    });

    // Inicia o fluxo OAuth do Google. 
    // Passamos o sessionId também na query do redirectTo como redundância ao cookie.
    // O prompt: "select_account" força o Google a mostrar o seletor de contas, 
    // evitando que o app use uma sessão errada salva no browser do celular.
    await signIn("google", {
        redirectTo: `/mobile-auth-callback?sessionId=${encodeURIComponent(sessionId)}`,
        // @ts-ignore
        authorization: { params: { prompt: "select_account" } }
    });
}
