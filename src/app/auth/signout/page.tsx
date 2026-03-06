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
            // Chama o signOut do NextAuth v5 (Auth.js) que faz o POST e limpa o cookie
            await signOut({
                callbackUrl: callbackUrl,
                redirect: true
            });
        };

        performSignOut();
    }, [callbackUrl]);

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-zinc-500 animate-pulse font-medium">Saindo da conta...</p>
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
