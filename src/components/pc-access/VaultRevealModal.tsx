"use client";

import { useState, useEffect } from "react";
import { Shield, Eye, EyeOff, Copy, Check, AlertTriangle, Clock, X, Lock } from "lucide-react";

interface VaultRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountUsername: string;
  computerName: string;
}

export function VaultRevealModal({
  isOpen,
  onClose,
  accountId,
  accountUsername,
  computerName,
}: VaultRevealModalProps) {
  const [operatorPassword, setOperatorPassword] = useState("");
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de revelação
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [copied, setCopied] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setOperatorPassword("");
      setJustification("");
      setRevealedPassword(null);
      setError(null);
      setCopied(false);
      setTimeLeft(15);
    }
  }, [isOpen]);

  // Contagem regressiva de auto-ocultação após revelação
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (revealedPassword && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (revealedPassword && timeLeft <= 0) {
      // Tempo esgotado: limpa da memória imediatamente
      setRevealedPassword(null);
      onClose();
    }
    return () => clearInterval(timer);
  }, [revealedPassword, timeLeft, onClose]);

  if (!isOpen) return null;

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pc-access/vault/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          confirm_password: operatorPassword,
          justification: justification.trim() || "Consulta técnica operacional",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao descriptografar credencial");
      }

      setRevealedPassword(data.password);
      setTimeLeft(data.autoHideSeconds || 15);
    } catch (err: any) {
      setError(err.message || "Erro de autenticação");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!revealedPassword) return;
    navigator.clipboard.writeText(revealedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header com indicador de segurança */}
        <div className="bg-surface-hover/80 px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Cofre de Credenciais</h3>
              <p className="text-xs text-muted-foreground">Acesso protegido com auditoria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informações do Alvo */}
        <div className="px-6 py-3 bg-muted/20 border-b border-border/50 text-xs text-muted-foreground flex items-center justify-between">
          <div>
            Conta: <strong className="text-foreground">{accountUsername}</strong>
          </div>
          <div>
            PC: <strong className="text-foreground">{computerName}</strong>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {!revealedPassword ? (
            <form onSubmit={handleReveal} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Esta operação requer autorização e será <strong>registrada no histórico de auditoria</strong> com seu usuário, data, hora e IP.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Sua Senha do Syngeti (Confirmação)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={operatorPassword}
                    onChange={(e) => setOperatorPassword(e.target.value)}
                    placeholder="Digite sua senha de acesso..."
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 pl-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    autoFocus
                  />
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Motivo / Justificativa do Acesso
                </label>
                <input
                  type="text"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Ex: Suporte técnico, formatação, troca de peças..."
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
                  {error}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !operatorPassword}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? "Descriptografando..." : "Desbloquear Credencial"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Barra de Contagem Regressiva */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  Auto-ocultação em {timeLeft} segundos
                </span>
                <span className="text-[11px]">Proteção ativa em memória</span>
              </div>

              <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(timeLeft / 15) * 100}%` }}
                />
              </div>

              {/* Caixa da Senha */}
              <div className="p-4 rounded-xl bg-surface-hover border border-border flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Senha Descriptografada
                  </span>
                  <div className="font-mono text-base font-semibold text-foreground tracking-wider select-all truncate">
                    {showPasswordText ? revealedPassword : "••••••••••••••••"}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="p-2 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                    title={showPasswordText ? "Ocultar" : "Mostrar"}
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      copied
                        ? "bg-emerald-500 text-white"
                        : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground leading-relaxed text-center">
                A credencial será apagada da memória assim que o cronômetro zerar ou ao fechar esta janela.
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors"
              >
                Concluir e Ocultar Agora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
