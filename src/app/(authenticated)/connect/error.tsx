"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function ConnectChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ConnectChatError Boundary] Erro contido no módulo Connect Chat:", error);
  }, [error]);

  return (
    <div className="flex-1 h-full min-h-[420px] flex items-center justify-center bg-background border border-border rounded-xl p-6">
      <div className="w-full max-w-md text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mb-5 shadow-md">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-1.5">
          Isolamento de Falha — Connect Chat
        </span>

        <h2 className="text-xl font-extrabold text-foreground mb-2">
          Instabilidade temporária no chat
        </h2>

        <p className="text-xs text-muted-foreground leading-relaxed mb-6 max-w-sm">
          Ocorreu uma falha isolada ao renderizar o módulo de mensagens. Os demais módulos do Syngeti permanecem operando normalmente.
        </p>

        {error?.digest && (
          <p className="text-[10px] font-mono text-muted-foreground/70 mb-4">
            Código de diagnóstico: {error.digest}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recarregar Connect Chat
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-foreground font-semibold text-xs transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Ir para o Painel
          </Link>
        </div>
      </div>
    </div>
  );
}
