"use client";

import { useEffect, Suspense, useRef } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function SignOutContent() {
    const searchParams = useSearchParams();
    const finalCallbackUrl = searchParams.get("callbackUrl") || "/";

    const isStarted = useRef(false);
    useEffect(() => {
        const performSignOut = async () => {
            if (isStarted.current) return;
            isStarted.current = true;
            
            console.log("AUTH SIGNOUT: Starting process...");

            try {
                // Realiza apenas o logout no domínio central
                await signOut({
                    callbackUrl: finalCallbackUrl,
                    redirect: true
                });
            } catch (err) {
                console.warn("Global signOut encountered a minor error, forcing manual redirect:", err);
                window.location.href = finalCallbackUrl;
            }
        };

        performSignOut();
    }, [finalCallbackUrl]);

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center text-zinc-950 p-6 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
            <p className="text-zinc-500 animate-pulse font-medium text-lg uppercase tracking-widest leading-relaxed">
                Saindo da conta...
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
