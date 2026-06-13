"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"password" | "magic-link">("password");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push("/");
      }
    };
    checkUser();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (loginMode === "password") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage({ type: "success", text: "Login efetuado com sucesso! Redirecionando..." });
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1500);
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        setMessage({
          type: "success",
          text: "Link de acesso enviado! Verifique sua caixa de entrada de e-mail.",
        });
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      setMessage({
        type: "error",
        text: err.message || "Ocorreu um erro ao tentar efetuar login. Verifique suas credenciais.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111622] nebula-gradient flex flex-col justify-center items-center px-4 font-sans relative overflow-hidden">
      {/* Background Decorative Circles */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 bg-yellow-500/5 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full bg-[#1A1D29]/90 border border-[#E2B042]/20 p-8 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md relative z-10 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 mx-auto rounded-full border border-[#E2B042] flex items-center justify-center bg-[#111622] text-[#E2B042] font-semibold text-xl shadow-[0_0_15px_rgba(226,176,66,0.3)]">
            Ω
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2B042] to-purple-400 font-[family-name:var(--font-josefin-sans)]">
            COSMO ALMA TV
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#E2B042]">Portal Egrégora</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-[#111622] p-1 rounded-lg border border-gray-800">
          <button
            type="button"
            onClick={() => { setLoginMode("password"); setMessage(null); }}
            className={`flex-1 py-2 rounded-md text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer ${
              loginMode === "password"
                ? "bg-[#E2B042] text-black shadow-md font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🔑 GESTÃO (SENHA)
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode("magic-link"); setMessage(null); }}
            className={`flex-1 py-2 rounded-md text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer ${
              loginMode === "magic-link"
                ? "bg-[#E2B042] text-black shadow-md font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🧘 CRIADOR (EMAIL)
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
              Endereço de E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full bg-[#111622] border border-gray-800 rounded-lg p-3 text-sm focus:border-[#E2B042] focus:outline-none text-white transition-colors"
            />
          </div>

          {loginMode === "password" && (
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111622] border border-gray-800 rounded-lg p-3 text-sm focus:border-[#E2B042] focus:outline-none text-white transition-colors"
              />
            </div>
          )}

          {message && (
            <div
              className={`p-3 rounded-lg text-xs leading-relaxed ${
                message.type === "success"
                  ? "bg-green-950/60 border border-green-800/80 text-green-300"
                  : "bg-red-950/60 border border-red-800/80 text-red-300"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#E2B042] hover:bg-[#D69E2E] disabled:opacity-50 text-black font-bold rounded-lg text-xs tracking-wider uppercase transition-all shadow-[0_4px_12px_rgba(226,176,66,0.2)] cursor-pointer"
          >
            {loading ? "Processando..." : loginMode === "password" ? "Entrar no Painel" : "Enviar Link de Acesso"}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-400 transition-colors"
          >
            ← Voltar para Onboarding Público
          </button>
        </div>
      </div>
    </div>
  );
}
