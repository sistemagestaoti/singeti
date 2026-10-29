"use client";

import Link from "next/link";
import { HeadphonesIcon, ExternalLink, ArrowRight, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

export interface TicketShareData {
  ticketId: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  departmentName?: string | null;
  assignedToName?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
  NEW: { label: "Novo", badge: "bg-blue-500/10 text-blue-500 border-blue-500/30", icon: Clock },
  TRIAGE: { label: "Em Triagem", badge: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: Clock },
  ASSIGNED: { label: "Atribuído", badge: "bg-blue-600/10 text-blue-400 border-blue-600/30", icon: Clock },
  IN_PROGRESS: { label: "Em Atendimento", badge: "bg-amber-500/10 text-amber-500 border-amber-500/30", icon: Clock },
  WAITING_USER: { label: "Aguardando Usuário", badge: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: Clock },
  WAITING_VENDOR: { label: "Aguardando Fornecedor", badge: "bg-amber-600/10 text-amber-500 border-amber-600/30", icon: Clock },
  RESOLVED: { label: "Resolvido", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
  CLOSED: { label: "Encerrado", badge: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  CANCELED: { label: "Cancelado", badge: "bg-rose-500/10 text-rose-500 border-rose-500/30", icon: ShieldAlert },
};

const PRIORITY_BADGES: Record<string, string> = {
  CRITICAL: "bg-rose-500/15 text-rose-500 border-rose-500/30 font-bold",
  HIGH: "bg-amber-500/15 text-amber-500 border-amber-500/30 font-semibold",
  MEDIUM: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  LOW: "bg-muted text-muted-foreground border-border",
};

export function TicketShareCard({ data, isMe }: { data: TicketShareData; isMe: boolean }) {
  const statusInfo = STATUS_CONFIG[data.status] || {
    label: data.status,
    badge: "bg-surface border-border text-foreground",
    icon: Clock,
  };
  const StatusIcon = statusInfo.icon;
  const priorityClass = PRIORITY_BADGES[data.priority] || PRIORITY_BADGES.MEDIUM;

  return (
    <div
      className={`rounded-2xl border p-4 max-w-sm sm:max-w-md shadow-xs transition-all ${
        isMe
          ? "bg-surface/90 border-primary/40 text-foreground"
          : "bg-surface border-border text-foreground"
      }`}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <HeadphonesIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-primary tracking-wide">
              {data.code}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1.5 font-medium">Chamado Vinculado</span>
          </div>
        </div>

        {/* Priority Badge */}
        <span className={`px-2 py-0.5 rounded-md text-[10px] border uppercase ${priorityClass}`}>
          {data.priority === "CRITICAL"
            ? "Crítica"
            : data.priority === "HIGH"
            ? "Alta"
            : data.priority === "MEDIUM"
            ? "Média"
            : "Baixa"}
        </span>
      </div>

      {/* Title */}
      <div className="py-2.5">
        <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2">
          {data.title}
        </h4>
        {data.departmentName && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Setor: <strong className="text-foreground font-medium">{data.departmentName}</strong>
          </p>
        )}
      </div>

      {/* Footer com Status e Botão Abrir */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.badge}`}>
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </span>

        <Link
          href={`/service-desk/${data.ticketId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-2xs"
        >
          <span>Abrir Chamado</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
