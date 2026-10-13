"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token de redefinição não encontrado na URL. Solicite uma nova recuperação.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Link inválido. Por favor, solicite uma nova recuperação.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve possuir no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao redefinir senha.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Erro ao conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0f172a] p-10 rounded-[24px] border border-border/60 shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          SYNGETI LOG • Segurança
        </span>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Redefinir Senha</h2>
        <p className="text-sm text-muted-foreground">
          Crie uma nova senha segura para acessar sua conta na plataforma.
        </p>
      </div>

      {success ? (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Senha alterada com sucesso!</h3>
            <p className="text-xs text-muted-foreground">
              Suas novas credenciais já estão ativas no sistema.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-primary-hover shadow-lg shadow-primary/20"
          >
            <span>Ir para o Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nova Senha */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground ml-1">Nova Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#050D1B] border border-border text-foreground text-sm rounded-xl py-3.5 pl-11 pr-12 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground"
                placeholder="Mínimo 6 caracteres"
                disabled={!token || loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground ml-1">Confirmar Nova Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#050D1B] border border-border text-foreground text-sm rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground"
                placeholder="Repita a nova senha"
                disabled={!token || loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!token || loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary/20 mt-4"
          >
            {loading ? "Salvando nova senha..." : "Redefinir e Salvar Senha"}
          </button>

          <div className="text-center pt-2">
            <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              &larr; Voltar para a tela de login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen bg-[#050D1B] text-foreground font-sans items-center justify-center p-6">
      <Suspense fallback={<div className="text-white text-sm">Carregando...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
