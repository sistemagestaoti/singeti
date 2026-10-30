"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, ShieldAlert, Activity, Database, Server, 
  Cpu, GitBranch, RefreshCw, AlertTriangle, CheckCircle2, 
  XCircle, Clock, Zap, MessageSquare, Terminal, Play, 
  Check, X, ChevronRight, Layers, FileText, Send, Sparkles,
  ArrowUpRight, ArrowDownRight, Eye, Shield
} from "lucide-react";
import { PlatformHealthReport, SentinelaChatMessage } from "@/lib/sentinela/types";

interface SentinelaDashboardProps {
  initialReport: PlatformHealthReport;
  initialIncidents: any[];
  initialActions: any[];
}

export function SentinelaDashboard({
  initialReport,
  initialIncidents,
  initialActions,
}: SentinelaDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "monitoring" | "incidents" | "actions" | "chat">("overview");
  const [report, setReport] = useState<PlatformHealthReport>(initialReport);
  const [incidents, setIncidents] = useState<any[]>(initialIncidents);
  const [actions, setActions] = useState<any[]>(initialActions);
  const [isAuditing, setIsAuditing] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // Estados do Chat com Sentinela IA
  const [chatMessages, setChatMessages] = useState<SentinelaChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `### 🛡️ CENTRAL INTELIGENTE SYNGETI SENTINELA IA
Olá! Sou o **Agente de Engenharia SRE e Auditoria Contínua** do Syngeti.
Estou monitorando em tempo real o frontend, rotas de API, conexões do Supabase PostgreSQL, funções da Vercel e integridade dos dados.

**Como posso apoiar a estabilidade da plataforma agora?**`,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll no chat
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Disparar Auditoria Manual em Tempo Real
  const triggerManualAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/sentinela/audit", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
        }
      }
      // Atualiza incidentes
      const incRes = await fetch("/api/sentinela/incidents");
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.incidents || []);
      }
    } catch (err) {
      console.error("Erro na auditoria:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Enviar mensagem no Chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || isChatLoading) return;

    const userMsg: SentinelaChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/sentinela/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setChatMessages((prev) => [...prev, data.reply]);
        }
      } else {
        throw new Error("Falha ao comunicar com o agente");
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ Não foi possível processar a consulta no momento: ${err?.message || "Erro desconhecido"}.`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Executar ou Aprovar Ação
  const handleExecuteAction = async (actionId: string, operation: "APPROVE" | "EXECUTE" | "REJECT") => {
    setExecutingActionId(actionId);
    try {
      const res = await fetch("/api/sentinela/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, operation }),
      });

      if (res.ok) {
        // Recarrega ações
        const actRes = await fetch("/api/sentinela/actions");
        if (actRes.ok) {
          const actData = await actRes.json();
          setActions(actData.actions || []);
        }
        // Recarrega relatório de saúde
        triggerManualAudit();
      }
    } catch (err) {
      console.error("Erro ao executar ação:", err);
    } finally {
      setExecutingActionId(null);
    }
  };

  // Status Color Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
      case "OK":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          text: "text-emerald-500",
          label: "Saudável",
          icon: ShieldCheck,
        };
      case "WARNING":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          text: "text-amber-500",
          label: "Atenção",
          icon: AlertTriangle,
        };
      case "CRITICAL":
      case "ERROR":
        return {
          bg: "bg-rose-500/10",
          border: "border-rose-500/20",
          text: "text-rose-500",
          label: "Crítico",
          icon: ShieldAlert,
        };
      default:
        return {
          bg: "bg-neutral-500/10",
          border: "border-neutral-500/20",
          text: "text-neutral-400",
          label: "Desconhecido",
          icon: Clock,
        };
    }
  };

  const currentBadge = getStatusBadge(report.status);
  const StatusIcon = currentBadge.icon;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* ==================================================================== */}
      {/* CABEÇALHO DO SENTINELA IA COM ABAS E BOTÃO DE AUDITORIA               */}
      {/* ==================================================================== */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              SRE & Automação Inteligente
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              v2.0 • Inspeção Contínua
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 tracking-tight flex items-center gap-2.5">
            <span>SYNGETI SENTINELA IA</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
            Central inteligente de auditoria, prevenção de falhas, análise de incidentes e otimização contínua.
          </p>
        </div>

        {/* Ações do Cabeçalho */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={triggerManualAudit}
            disabled={isAuditing}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
            <span>{isAuditing ? "Auditanando Plataforma..." : "Executar Auditoria Geral"}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* BARRA DE NAVEGAÇÃO ENTRE AS ABAS DO SENTINELA                         */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-surface p-1.5 rounded-2xl border border-border shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "overview"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Saúde da Plataforma</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("monitoring")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "monitoring"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Monitoramento em Tempo Real</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("incidents")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "incidents"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Incidentes & Alertas ({incidents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("actions")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "actions"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Automação & Correções ({actions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "chat"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat com o Sentinela IA</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: VISÃO GERAL & SAÚDE DA PLATAFORMA                             */}
      {/* ==================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Card Principal de Estado Geral */}
          <div className={`p-6 rounded-2xl border ${currentBadge.border} ${currentBadge.bg} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl border ${currentBadge.border} bg-surface flex items-center justify-center shrink-0 shadow-xs`}>
                <StatusIcon className={`w-8 h-8 ${currentBadge.text}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider ${currentBadge.text}`}>
                    ESTADO GERAL DA PLATAFORMA
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Última verificação: {new Date(report.timestamp).toLocaleTimeString("pt-BR")}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
                  Plataforma {currentBadge.label} — Confiabilidade {report.score}%
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {report.summary.passedProbes} de {report.summary.totalProbes} sondas operando com sucesso. Latência média do sistema: {report.summary.avgLatencyMs}ms.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className="px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground hover:text-primary hover:border-primary/40 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Interrogar Agente</span>
              </button>
            </div>
          </div>

          {/* Grid com 4 Indicadores Chave de Desempenho (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Latência Média */}
            <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Latência Média</span>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-foreground mt-2">
                {report.summary.avgLatencyMs} <span className="text-xs font-medium text-muted-foreground">ms</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {report.summary.avgLatencyMs < 600 ? "Excelente tempo de resposta" : "Dentro da margem nominal"}
              </p>
            </div>

            {/* KPI 2: Conexões Supabase */}
            <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">PostgreSQL (Supabase)</span>
                <Database className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-foreground mt-2">
                {report.metrics.database.latencyMs} <span className="text-xs font-medium text-muted-foreground">ms ping</span>
              </div>
              <p className="text-[11px] text-emerald-500 font-semibold mt-1">
                Pool ativo em AWS São Paulo
              </p>
            </div>

            {/* KPI 3: Memória do Runtime */}
            <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Memória Heap (Node)</span>
                <Cpu className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-foreground mt-2">
                {report.metrics.runtime.memoryMb.heapUsed} <span className="text-xs font-medium text-muted-foreground">MB</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Total alocado: {report.metrics.runtime.memoryMb.heapTotal}MB
              </p>
            </div>

            {/* KPI 4: Confiabilidade do Chat */}
            <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">CONNECT CHAT (24h)</span>
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-foreground mt-2">
                {report.metrics.database.tableCounts.chatMessages || 0} <span className="text-xs font-medium text-muted-foreground">mensagens</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {report.metrics.database.pendingOutboxCount} falhas no outbox
              </p>
            </div>

          </div>

          {/* Grid de Serviços Monitorados */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center justify-between">
              <span>Sondas e Serviços em Monitoramento Ativo</span>
              <span className="text-xs font-normal text-muted-foreground">
                {report.probes.length} serviços auditados
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {report.probes.map((p, idx) => {
                const b = getStatusBadge(p.status);
                const Icon = b.icon;
                return (
                  <div key={idx} className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-3 shadow-2xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground truncate">{p.name}</span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${b.bg} ${b.text}`}>
                          {b.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={p.message}>
                        {p.message}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                      {p.latencyMs}ms
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: MONITORAMENTO EM TEMPO REAL & MÉTRICAS                        */}
      {/* ==================================================================== */}
      {activeTab === "monitoring" && (
        <div className="space-y-6">
          {/* Métricas de APIs do Sistema */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <span>Rotas de API Monitoradas Deterministicamente</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Serviço / Rota</th>
                    <th className="py-2.5 px-3">Endpoint</th>
                    <th className="py-2.5 px-3">Status HTTP</th>
                    <th className="py-2.5 px-3">Tempo de Resposta</th>
                    <th className="py-2.5 px-3">Condição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {report.metrics.apis.endpoints.map((ep, i) => (
                    <tr key={i} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground">{ep.name}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{ep.path}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {ep.statusCode} OK
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-foreground font-bold">{ep.latencyMs} ms</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-500 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Nominal</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Volumetria de Tabelas do Banco de Dados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>Volumetria do Banco PostgreSQL (Supabase)</span>
              </h3>
              <div className="space-y-2">
                {Object.entries(report.metrics.database.tableCounts).map(([tbl, count]) => (
                  <div key={tbl} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs">
                    <span className="font-mono text-muted-foreground">{tbl}</span>
                    <span className="font-bold text-foreground">{count} registros</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                <span>Controle de Versão & Deployment</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-background rounded-xl border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Branch Ativa:</span>
                    <span className="font-mono font-bold text-primary">{report.metrics.git.branch}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Último Commit:</span>
                    <span className="font-mono text-foreground">[{report.metrics.git.latestCommitHash}]</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mensagem:</span>
                    <span className="font-semibold text-foreground truncate max-w-[200px]" title={report.metrics.git.latestCommitMessage}>
                      {report.metrics.git.latestCommitMessage}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 3: INCIDENTES & DIAGNÓSTICOS                                     */}
      {/* ==================================================================== */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-1">
              Registro de Incidentes & Detecção Preventiva
            </h3>
            <p className="text-xs text-muted-foreground">
              Ocorrências identificadas automaticamente pelo Sentinela com rastro de auditoria e causa-raiz.
            </p>
          </div>

          {incidents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface border border-dashed border-border space-y-2">
              <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500/50" />
              <p className="text-sm font-bold text-foreground">Nenhum incidente ativo detectado</p>
              <p className="text-xs text-muted-foreground">Todas as sondas de frontend, backend e banco operam com 100% de integridade.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-5 rounded-2xl bg-surface border border-border hover:border-primary/40 transition-all shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        inc.severity === "CRITICAL"
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          : inc.severity === "HIGH"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {inc.module}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-muted-foreground">
                      Ocorrências: {inc.occurrence_count}x
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground">{inc.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{inc.description}</p>
                  </div>

                  {inc.root_cause && (
                    <div className="p-3 rounded-xl bg-background border border-border text-xs">
                      <span className="font-bold text-foreground block mb-0.5">Causa-Raiz Comprovada:</span>
                      <span className="text-muted-foreground">{inc.root_cause}</span>
                    </div>
                  )}

                  {inc.recommendation && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
                      <span className="font-bold text-primary block mb-0.5">Recomendação da IA:</span>
                      <span className="text-foreground">{inc.recommendation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 4: AUTOMAÇÃO & CORREÇÕES (NÍVEIS 1, 2, 3)                         */}
      {/* ==================================================================== */}
      {activeTab === "actions" && (
        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-1">
              Políticas de Autonomia & Execução Controlada
            </h3>
            <p className="text-xs text-muted-foreground">
              Estrutura hierárquica estrita para garantia de estabilidade, sem ações destrutivas cegas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] font-black uppercase text-emerald-500 block">NÍVEL 1 — SEGURO</span>
                <span className="text-xs font-bold text-foreground block mt-0.5">Ações Automáticas</span>
                <p className="text-[11px] text-muted-foreground mt-1">Sondas de saúde, purga de cache, reprocessamento de outbox e testes não destrutivos.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <span className="text-[10px] font-black uppercase text-amber-500 block">NÍVEL 2 — APROVAÇÃO</span>
                <span className="text-xs font-bold text-foreground block mt-0.5">Requer Autorização</span>
                <p className="text-[11px] text-muted-foreground mt-1">Ajustes de índices, correções de código, propostas de patch e reconfigurações operacionais.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <span className="text-[10px] font-black uppercase text-rose-500 block">NÍVEL 3 — RESTRITO</span>
                <span className="text-xs font-bold text-foreground block mt-0.5">Crítico Bloqueado</span>
                <p className="text-[11px] text-muted-foreground mt-1">Alterações destrutivas em banco (drop/truncate), modificação de credenciais e acessos RLS.</p>
              </div>
            </div>
          </div>

          {/* Lista de Ações Propostas e Executadas */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-foreground mb-2">
              Fila de Ações Técnicas
            </h3>

            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nenhuma ação pendente de aprovação ou em execução no momento.
              </p>
            ) : (
              <div className="space-y-3">
                {actions.map((act) => (
                  <div key={act.id} className="p-4 rounded-xl border border-border bg-background space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          NÍVEL {act.autonomy_level}
                        </span>
                        <span className="text-xs font-bold text-foreground">{act.title}</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        act.status === "EXECUTED"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : act.status === "REJECTED"
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {act.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">{act.description}</p>

                    {act.status === "PROPOSED" && act.autonomy_level === 2 && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <button
                          type="button"
                          onClick={() => handleExecuteAction(act.id, "APPROVE")}
                          disabled={executingActionId === act.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aprovar e Executar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteAction(act.id, "REJECT")}
                          disabled={executingActionId === act.id}
                          className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Rejeitar</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 5: CHAT COM O AGENTE SENTINELA IA                                */}
      {/* ==================================================================== */}
      {activeTab === "chat" && (
        <div className="bg-surface rounded-2xl border border-border shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Header do Chat */}
          <div className="p-4 border-b border-border bg-surface-elevated/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Console do Sentinela IA</h3>
                <p className="text-[11px] text-muted-foreground">Engenharia SRE, auditoria em tempo real e resolução de falhas</p>
              </div>
            </div>

            {/* Atalhos Rápidos */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSendMessage("Analise a lentidão das abas e consultas")}
                className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-surface text-[11px] font-semibold text-foreground transition-colors"
              >
                ⚡ Lentidão
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Verifique a saúde do CONNECT CHAT")}
                className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-surface text-[11px] font-semibold text-foreground transition-colors"
              >
                💬 Chat
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Verifique o banco Supabase")}
                className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-surface text-[11px] font-semibold text-foreground transition-colors"
              >
                🗄️ Supabase
              </button>
            </div>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-surface border border-border text-primary"
                  }`}
                >
                  {msg.role === "user" ? "U" : <Sparkles className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-1.5">
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-tr-xs"
                        : "bg-surface border border-border text-foreground rounded-tl-xs shadow-xs"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Ação Sugerida pela IA */}
                  {msg.suggestedAction && (
                    <div className="p-3 rounded-xl bg-surface border border-primary/30 flex items-center justify-between gap-3 shadow-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-primary block">AÇÃO SUGERIDA (NÍVEL {msg.suggestedAction.autonomyLevel})</span>
                        <span className="text-xs font-bold text-foreground truncate block">{msg.suggestedAction.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          fetch("/api/sentinela/actions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              newAction: {
                                title: msg.suggestedAction!.title,
                                description: "Executado via sugestão direta do Sentinela IA.",
                                actionType: msg.suggestedAction!.type,
                                autonomyLevel: msg.suggestedAction!.autonomyLevel,
                              },
                            }),
                          }).then(() => triggerManualAudit());
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
                      >
                        Executar Ação
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-muted-foreground font-mono block px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground animate-pulse">
                <Sparkles className="w-4 h-4 text-primary animate-spin" />
                <span>O Sentinela IA está auditando telemetria e formulando o diagnóstico...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input do Chat */}
          <div className="p-3 border-t border-border bg-surface flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Pergunte ao Sentinela IA (ex: 'Analise a lentidão das abas', 'Verifique o chat')..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
              disabled={isChatLoading}
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim() || isChatLoading}
              className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-40 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
