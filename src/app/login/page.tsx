"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Network, Mail, Lock, Eye, EyeOff, ArrowRight, Check } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen bg-[#020817] text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Lado Esquerdo - Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-[#0f172a] via-[#020817] to-[#020817] border-r border-slate-800/50">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Network className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-widest text-white">SINGETI</span>
        </div>

        {/* Copy / Texto Central */}
        <div className="max-w-lg">
          <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-2">
            Gestão Inteligente<br />
            <span className="text-blue-500">para sua TI.</span>
          </h1>
          <p className="mt-6 text-slate-400 text-lg leading-relaxed">
            Centralize chamados, monitore ativos e gerencie toda a 
            operação de tecnologia da sua empresa em uma plataforma 
            unificada e de alta performance.
          </p>
        </div>

        {/* Rodapé do lado esquerdo */}
        <div className="text-xs text-slate-500 font-medium">
          © 2026 SINGETI. Todos os direitos reservados.
        </div>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 bg-[#020817]">
        <div className="w-full max-w-md bg-[#0f172a] p-10 rounded-[24px] border border-slate-800/60 shadow-2xl">
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta</h2>
            <p className="text-sm text-slate-400">Insira suas credenciais para acessar o painel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Campo E-mail */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 ml-1">E-mail ou Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#020817] border border-slate-800 text-slate-200 text-sm rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
                  placeholder="admin"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 ml-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#020817] border border-slate-800 text-slate-200 text-sm rounded-xl py-3.5 pl-11 pr-12 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Lembrar / Esqueceu a Senha */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-slate-700 bg-[#020817] group-hover:border-blue-500'}`}>
                  {rememberMe && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Lembrar-me</span>
              </label>
              <a href="#" className="text-xs text-blue-500 hover:text-blue-400 font-medium transition-colors">
                Esqueceu a senha?
              </a>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center font-medium bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                {error}
              </div>
            )}

            {/* Botão de Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-lg shadow-blue-600/20 mt-4"
            >
              {loading ? "Acessando..." : "Acessar Sistema"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

          </form>
        </div>
      </div>

    </div>
  );
}
