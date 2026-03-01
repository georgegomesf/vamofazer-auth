import Link from "next/link";
import { ShieldPlus } from "lucide-react";
import RegisterForm from "@/components/auth/register-form";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#1a1a1a_0%,transparent_70%)] opacity-50" />

            <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20 mb-6">
                        <ShieldPlus className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                        Crie sua conta
                    </h1>
                    {/* <p className="text-zinc-400">Junte-se a nós para começar sua jornada</p> */}
                </div>

                <RegisterForm />

                <p className="mt-10 text-center text-zinc-500 text-sm">
                    Já tem uma conta?
                    <Link href="/auth/signin" className="text-white font-semibold hover:underline decoration-emerald-500 underline-offset-4">
                        Fazer login
                    </Link>
                </p>
            </div>
        </div>
    );
}
