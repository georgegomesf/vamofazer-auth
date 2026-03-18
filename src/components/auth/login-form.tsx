"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { Mail, Lock, User, ShieldCheck, MailQuestion, Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/icons";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { prepareMagicLinkUser } from "@/actions/magic-link";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const emailSent = searchParams.get("email_sent") === "true";
    const verified = searchParams.get("verified") === "true";
    const registeredEmail = searchParams.get("email") || "";
    const autoLogin = searchParams.get("autoLogin");
    const projectId = searchParams.get("projectId");

    const [magicLinkSent, setMagicLinkSent] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        // Em vez de ir direto para o front, enviamos para uma rota protegida no @auth
        // que o middleware (proxy.ts) irá interceptar para anexar o token 'st'.
        const transferUrl = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}${projectId ? `&projectId=${projectId}` : ""}`;
        await signIn("google", { callbackUrl: transferUrl });
    };

    useEffect(() => {
        if (autoLogin === "google" && !loading) {
            handleGoogleLogin();
        }
    }, [autoLogin]);

    const handleCredentialsLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                email: email || registeredEmail,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError("E-mail ou senha inválidos");
                setLoading(false);
            } else {
                // Redirecionamos para a própria rota de signin do @auth.
                // Como o usuário acabou de logar, o middleware (proxy.ts) vai notar
                // que ele está autenticado e fará o "salto" para o front com o token 'st'.
                window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
            }
        } catch (err) {
            setError("Algo deu errado. Tente novamente.");
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        const userEmail = email || registeredEmail;
        if (!userEmail) {
            setError("Digite seu e-mail primeiro");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const prep = await prepareMagicLinkUser(userEmail);
            if (prep.error) {
                setError(prep.error);
                setLoading(false);
                return;
            }

            // Usamos a rota de signin do @auth como ponte para o middleware interceptar
            // o clique no e-mail e anexar o token de transferência antes de ir para o front.
            const transferUrl = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}${projectId ? `&projectId=${projectId}` : ""}`;

            const res = await signIn("email", {
                email: userEmail,
                callbackUrl: transferUrl,
                redirect: false
            });

            if (res?.error) {
                setError("Não foi possível enviar o link. Verifique o e-mail.");
            } else {
                setMagicLinkSent(true);
            }
        } catch (err) {
            setError("Erro ao solicitar link de acesso.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {emailSent && (
                <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 p-4 rounded-xl text-sm leading-relaxed">
                    Conta criada! Enviamos um link de confirmação para <strong>{registeredEmail}</strong>. Verifique sua caixa de entrada para ativar sua conta.
                </div>
            )}
            {magicLinkSent && (
                <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 p-4 rounded-xl text-sm leading-relaxed text-center">
                    Link de acesso enviado! Verifique seu e-mail (<strong>{email || registeredEmail}</strong>) para entrar.
                </div>
            )}
            {verified && (
                <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-4 rounded-xl text-sm leading-relaxed text-center">
                    Email verificado com sucesso. Faça seu login.
                </div>
            )}

            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-zinc-950 font-semibold py-3.5 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all duration-200 group disabled:opacity-50 shadow-sm"
            >
                <GoogleIcon className="w-5 h-5" />
                <span>Continuar com Google</span>
            </button>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-4 text-zinc-400 font-medium tracking-widest">ou use e-mail e senha</span>
                </div>
            </div>

            <form onSubmit={handleCredentialsLogin} className="space-y-5">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-600 ml-1">E-mail</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="email"
                            value={email || registeredEmail}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                            className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-zinc-400"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-sm font-medium text-zinc-600">Senha</label>
                        <Link href="/auth/reset" className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
                            Esqueceu a senha?
                        </Link>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-zinc-400"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Entrar Agora"}
                </button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-4 text-zinc-400 font-medium tracking-widest">OU receba um</span>
                </div>
            </div>

            <div className="flex gap-3 justify-center">
                <button
                    onClick={handleMagicLink}
                    disabled={loading}
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-950 text-sm transition-colors border border-zinc-200 rounded-lg px-4 py-2 hover:bg-zinc-50 disabled:opacity-50"
                >
                    <MailQuestion className="w-4 h-4" />
                    LINK de acesso por e-mail
                </button>
            </div>
        </div>
    );
}
