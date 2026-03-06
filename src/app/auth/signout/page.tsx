"use client";

import { useEffect, Suspense } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function SignOutContent() {
    const searchParams = useSearchParams();
    const finalCallbackUrl = searchParams.get("callbackUrl") || "/";

    useEffect(() => {
        const performSignOut = async () => {
            // 1. Limpa a sessão global no @auth
            await signOut({ redirect: false });

            // 2. Encaminha para limpar os cookies nos domínios específicos
            // O ideal é passar por todos os apps se o domínio do @auth for central.

            // Ordem: Admin -> Front -> Destino Final
            const bckUrl = "https://adm.vamofazer.com.br/auth/signout";
            const frontUrl = "https://myrviaegeorge.com.br/auth/signout";

            // Se ainda não estamos vindo de uma dessas limpezas, iniciamos a corrente
            const currentUrl = window.location.href;
            const fromBck = searchParams.get("from") === "bck";
            const fromFront = searchParams.get("from") === "front";

            if (!fromBck && !fromFront) {
                // Inicia a corrente: do @auth vai para o @bck
                const nextUrl = new URL(bckUrl);
                nextUrl.searchParams.set("from", "auth");

                // O próximo do @bck deve ser o @front
                const bckCallback = new URL(frontUrl);
                bckCallback.searchParams.set("from", "bck");
                bckCallback.searchParams.set("callbackUrl", finalCallbackUrl);

                nextUrl.searchParams.set("callbackUrl", bckCallback.toString());
                window.location.href = nextUrl.toString();
            } else {
                // Se já terminamos a corrente de redirecionamentos, vai para o destino final
                window.location.href = finalCallbackUrl;
            }
        };

        performSignOut();
    }, [finalCallbackUrl, searchParams]);

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-zinc-500 animate-pulse font-medium text-lg uppercase tracking-widest">Sincronizando Logout Global...</p>
        </div>
    );
}

export default function SignOutPage() {
    return (
        <Suspense fallback={null}>
            <SignOutContent />
        </Suspense>
    );
}
