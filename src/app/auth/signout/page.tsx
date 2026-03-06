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
            console.log("AUTH GLOBAL SIGNOUT: Starting process...");

            // 1. Limpa a sessão global no @auth (domínio .vamofazer.com.br)
            // Usamos redirect: false para manter o controle do fluxo aqui.
            try {
                await signOut({ redirect: false });
            } catch (e) {
                console.error("AUTH GLOBAL SIGNOUT: Error clearing local session", e);
            }

            // 2. Corrente de Logout em Domínios Diferentes
            // Devemos passar por todos os apps se o domínio do @auth for central.

            // Ordem: Admin -> Front -> Destino Final
            const bckUrl = "https://adm.vamofazer.com.br/auth/signout";
            const frontUrl = "https://myrviaegeorge.com.br/auth/signout";

            const fromBck = searchParams.get("from") === "bck";
            const fromFront = searchParams.get("from") === "front";

            if (!fromBck && !fromFront) {
                console.log("AUTH GLOBAL SIGNOUT: Directing to Admin logout...");
                // Inicia a corrente: vai para o Admin
                const nextUrl = new URL(bckUrl);
                nextUrl.searchParams.set("from", "auth");

                // O Admin depois deve mandar para o Front
                const bckCallback = new URL(frontUrl);
                bckCallback.searchParams.set("from", "bck");
                bckCallback.searchParams.set("callbackUrl", finalCallbackUrl);

                nextUrl.searchParams.set("callbackUrl", bckCallback.toString());
                window.location.href = nextUrl.toString();
            } else {
                console.log("AUTH GLOBAL SIGNOUT: Logout chain complete. Going to final destination.");
                window.location.href = finalCallbackUrl;
            }
        };

        performSignOut();
    }, [finalCallbackUrl, searchParams]);

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-zinc-500 animate-pulse font-medium text-lg uppercase tracking-widest leading-relaxed text-center">
                Desconectando de todos os sistemas...<br />
                <span className="text-[10px] opacity-50">Sincronizando Logout Global</span>
            </p>
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
