"use client";

import { HelpCircle } from "lucide-react";
import { useContextualHelp } from "./ContextualHelpContext";

interface HelpButtonProps {
  contextOverride?: string;
  className?: string;
  showText?: boolean;
}

export function HelpButton({
  contextOverride,
  className = "",
  showText = true,
}: HelpButtonProps) {
  const { openHelp } = useContextualHelp();

  return (
    <button
      type="button"
      onClick={() => openHelp(contextOverride)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-foreground hover:text-primary transition-all text-xs font-bold shadow-xs cursor-pointer group ${className}`}
      title="Consultar Manual Oficial e Ajuda desta tela"
      aria-label="Ajuda contextual"
    >
      <div className="w-5 h-5 rounded-full bg-primary/10 group-hover:bg-primary/20 text-primary flex items-center justify-center shrink-0 transition-colors">
        <HelpCircle className="w-3.5 h-3.5" />
      </div>
      {showText && <span className="font-bold text-xs">Ajuda</span>}
    </button>
  );
}
