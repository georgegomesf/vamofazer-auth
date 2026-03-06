"use client";

import { useEffect, Suspense } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function SignOutContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    useEffect(() => {
        const performSignOut = async () => {
            // Primeiro: Deslogamos o serviço central @auth (limpa .vamofazer.com.br)
            await signOut({
                redirect: false
            });

            // Segundo: Se o logout NÃO foi disparado do front, precisamos ir lá limpar
            // Porque o front está em um domínio totalmente diferente (myrviaegeorge.com.br)
            const isFront = callbackUrl.includes("myrviaegeorge.com.br");

            if (!isFront) {
                // Redireciona para o callback silencioso no front
                const frontLogoutUrl = "https://myrviaegeorge.com.br/auth/signout";
                window.location.href = `${frontLogoutUrl}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
            } else {
                // Se já saímos do front e viemos pra cá, agora o logout está completo.
                window.location.href = callbackUrl;
            }
        };

        performSignOut();
    }, [callbackUrl]);

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-zinc-500 animate-pulse font-medium text-lg">Encerrando conexões seguras...</p>
            <p className="text-xs text-zinc-700 uppercase tracking-widest">Limpando registros globais</p>
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
