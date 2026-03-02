import { signIn } from "@/auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || '';

    // Inicia o fluxo OAuth do Google via NextAuth, redirecionando ao callback
    // com o sessionId preservado na querystring
    await signIn("google", {
        redirectTo: `/mobile-auth-callback?sessionId=${sessionId}`,
    });
}
