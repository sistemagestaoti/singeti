"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, Clock, ShieldAlert, User, 
  MessageSquare, Lock, AlertCircle, Laptop, Calendar, 
  Trash2, UserCheck, RefreshCw, Send, Check, X,
  Printer, Sparkles, Building, Layers, Eye
} from "lucide-react";

interface Comment {
  id: string;
  content: string;
  is_internal: boolean;
  created_at: string | Date;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

interface TicketDetailProps {
  initialTicket: any;
  categories: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  assets: Array<{ id: string; name: string; internal_id: string; asset_tag?: string | null }>;
  users: Array<{ id: string; name: string; email: string }>;
  currentUser: { id: string; name: string; email: string; role?: string } | null;
}

const STATUS_STEPS = [
  { key: "NEW", label: "Novo", desc: "Aberto recentemente" },
  { key: "TRIAGE", label: "Em Triagem", desc: "Classificação técnica" },
  { key: "IN_PROGRESS", label: "Em Atendimento", desc: "Técnico atuando" },
  { key: "WAITING_USER", label: "Aguardando", desc: "Pendente resposta" },
  { key: "RESOLVED", label: "Resolvido", desc: "Solução aplicada" },
  { key: "CLOSED", label: "Encerrado", desc: "Finalizado formalmente" },
];

export default function TicketDetailClient({
  initialTicket,
  categories,
  departments,
  assets,
  users,
  currentUser,
}: TicketDetailProps) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initialTicket);
  const [comments, setComments] = useState<Comment[]>(initialTicket.comments || []);
  
  // Interactive Property Edits
  const [status, setStatus] = useState(initialTicket.status);
  const [assignedToId, setAssignedToId] = useState(initialTicket.assigned_to_id || "");
  const [priority, setPriority] = useState(initialTicket.priority);
  const [urgency, setUrgency] = useState(initialTicket.urgency || "MEDIUM");
  const [impact, setImpact] = useState(initialTicket.impact || "MEDIUM");
  const [categoryId, setCategoryId] = useState(initialTicket.category_id || "");
  const [groupId, setGroupId] = useState(initialTicket.group_id || "");
  const [assetId, setAssetId] = useState(initialTicket.asset_id || "");
  
  // Save State indicators
  const [savingProperty, setSavingProperty] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // New Comment Form State
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [commentStatusTarget, setCommentStatusTarget] = useState(initialTicket.status);
  const [sendingComment, setSendingComment] = useState(false);
  const [timelineTab, setTimelineTab] = useState<"ALL" | "PUBLIC" | "INTERNAL">("ALL");

  // SLA Calculation based on Priority & Created At
  const slaTargetHours = {
    CRITICAL: 4,
    HIGH: 8,
    MEDIUM: 24,
    LOW: 48,
  }[priority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"] || 24;

  const createdAtDate = new Date(ticket.created_at);
  const slaDeadline = new Date(createdAtDate.getTime() + slaTargetHours * 60 * 60 * 1000);
  const isSlaBreached = Date.now() > slaDeadline.getTime() && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED";

  // Fast Update API helper
  const updateTicketProperty = async (fields: Record<string, any>) => {
    setSavingProperty(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao atualizar chamado");
      }

      const updated = await res.json();
      setTicket(updated);
      if (fields.status) {
        setStatus(fields.status);
        setCommentStatusTarget(fields.status);
      }
      if (fields.assigned_to_id !== undefined) setAssignedToId(fields.assigned_to_id || "");
      if (fields.priority) setPriority(fields.priority);
      if (fields.urgency) setUrgency(fields.urgency);
      if (fields.impact) setImpact(fields.impact);
      if (fields.category_id !== undefined) setCategoryId(fields.category_id || "");
      if (fields.group_id !== undefined) setGroupId(fields.group_id || "");
      if (fields.asset_id !== undefined) setAssetId(fields.asset_id || "");

      if (updated.comments && Array.isArray(updated.comments)) {
        setComments(updated.comments);
      } else {
        // Refresh comments to fetch new audit entries
        const resUpdated = await fetch(`/api/tickets/${ticket.id}`);
        if (resUpdated.ok) {
          const full = await resUpdated.json();
          setComments(full.comments || []);
        }
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || "Falha na atualização");
    } finally {
      setSavingProperty(false);
    }
  };

  // Submit New Comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentStatusTarget === status) return;

    setSendingComment(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
          is_internal: isInternal,
          status: commentStatusTarget !== status ? commentStatusTarget : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao registrar comentário");
      }

      setCommentText("");
      if (commentStatusTarget !== status) {
        setStatus(commentStatusTarget);
      }

      // Reload ticket comments and status
      const resUpdated = await fetch(`/api/tickets/${ticket.id}`);
      if (resUpdated.ok) {
        const full = await resUpdated.json();
        setTicket(full);
        setStatus(full.status);
        setCommentStatusTarget(full.status);
        setComments(full.comments || []);
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar comentário");
    } finally {
      setSendingComment(false);
    }
  };

  // Delete Ticket
  const handleDeleteTicket = async () => {
    if (!confirm(`Deseja realmente excluir o chamado [${ticket.code}]?`)) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir chamado");

      router.push("/service-desk");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Falha na exclusão");
      setDeleteLoading(false);
    }
  };

  // Canned Responses
  const insertCannedResponse = (text: string, targetStatus?: string) => {
    setCommentText(text);
    if (targetStatus) {
      setCommentStatusTarget(targetStatus);
    }
  };

  // Filtered comments based on tabs
  const filteredComments = comments.filter((c) => {
    if (timelineTab === "PUBLIC") return !c.is_internal;
    if (timelineTab === "INTERNAL") return c.is_internal;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-6 rounded-2xl border border-border shadow-xs gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/service-desk"
            className="p-2.5 rounded-xl border border-border bg-surface-elevated text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shadow-xs"
            title="Voltar para a lista de chamados"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-extrabold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-md">
                {ticket.code}
              </span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {ticket.type === "INCIDENT" ? "Incidente" : "Requisição"}
              </span>
              <span className="text-xs text-muted-foreground">
                • Aberto em {new Date(ticket.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mt-1.5 tracking-tight">
              {ticket.title}
            </h1>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" ? (
            <button
              type="button"
              disabled={savingProperty}
              onClick={() => updateTicketProperty({ status: "RESOLVED" })}
              className="inline-flex items-center gap-1.5 bg-success/10 text-success border border-success/30 hover:bg-success/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Resolver Chamado</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={savingProperty}
              onClick={() => updateTicketProperty({ status: "IN_PROGRESS" })}
              className="inline-flex items-center gap-1.5 bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reabrir Chamado</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl border border-border bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors"
            title="Imprimir / Exportar Chamado"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={deleteLoading}
            onClick={handleDeleteTicket}
            className="p-2 rounded-xl border border-danger/20 text-danger hover:bg-danger/10 transition-colors"
            title="Excluir Chamado"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ITIL Status Stepper / Progress Journey */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs overflow-x-auto">
        <div className="min-w-[600px] flex items-center justify-between">
          {STATUS_STEPS.map((step, idx) => {
            const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
            const isCompleted = currentIdx > idx || status === "RESOLVED" || status === "CLOSED";
            const isCurrent = step.key === status;

            return (
              <div key={step.key} className="flex-1 flex items-center">
                <button
                  type="button"
                  onClick={() => updateTicketProperty({ status: step.key })}
                  className="flex flex-col items-center group cursor-pointer text-center mx-auto"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                    isCurrent 
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-sm"
                      : isCompleted
                      ? "bg-success text-success-foreground"
                      : "bg-surface-elevated border border-border text-muted-foreground group-hover:border-primary/50"
                  }`}>
                    {isCompleted && !isCurrent ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-[11px] font-bold mt-1.5 transition-colors ${
                    isCurrent ? "text-primary font-extrabold" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground line-clamp-1">{step.desc}</span>
                </button>
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-colors ${
                    isCompleted ? "bg-success" : "bg-border"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Content & Timeline on Left, Sidebar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Description & Timeline */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Resolution Card Highlight (if resolved) */}
          {(status === "RESOLVED" || status === "CLOSED") && (
            <div className="bg-success/10 border border-success/30 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-success font-bold text-sm mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Chamado Solucionado / Encerrado</span>
              </div>
              <p className="text-xs text-foreground/90">
                Este atendimento foi concluído. {ticket.resolved_at ? `Data de resolução: ${new Date(ticket.resolved_at).toLocaleString('pt-BR')}` : ''}
              </p>
            </div>
          )}

          {/* Ticket Description Box */}
          <div className="bg-surface shadow-xs rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Descrição Detalhada do Chamado
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                Solicitante: <strong className="text-foreground">{ticket.requester.name}</strong>
              </span>
            </div>

            <div className="bg-surface-elevated p-4 rounded-xl border border-border text-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {ticket.description}
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-surface shadow-xs rounded-2xl border border-border p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Linha do Tempo & Atendimento
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Histórico de mensagens com o usuário, anotações internas da equipe de TI e auditoria.
                </p>
              </div>

              {/* Timeline Filter Tabs */}
              <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-border self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTimelineTab("ALL")}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                    timelineTab === "ALL" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todas ({comments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineTab("PUBLIC")}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                    timelineTab === "PUBLIC" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Públicas
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineTab("INTERNAL")}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                    timelineTab === "INTERNAL" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Notas TI
                </button>
              </div>
            </div>

            {/* Comment List */}
            <div className="flow-root">
              {filteredComments.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  Nenhuma mensagem registrada nesta visualização.
                </div>
              ) : (
                <ul className="-mb-8">
                  {filteredComments.map((comment, commentIdx) => {
                    const isLast = commentIdx === filteredComments.length - 1;

                    return (
                      <li key={comment.id} className="relative pb-8">
                        {!isLast && (
                          <span 
                            className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-border" 
                            aria-hidden="true" 
                          />
                        )}

                        <div className="relative flex items-start gap-3.5">
                          {/* Avatar Initials */}
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-extrabold shrink-0 border shadow-xs ${
                            comment.is_internal 
                              ? "bg-warning/15 text-warning border-warning/30" 
                              : "bg-primary/15 text-primary border-primary/30"
                          }`}>
                            {comment.author?.name ? comment.author.name.charAt(0).toUpperCase() : "U"}
                          </div>

                          {/* Comment Bubble */}
                          <div className={`flex-1 rounded-2xl p-4 border transition-all ${
                            comment.is_internal 
                              ? "bg-warning/5 border-warning/25 shadow-xs" 
                              : "bg-surface-elevated border-border shadow-xs"
                          }`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-foreground">
                                  {comment.author?.name || "Usuário do Sistema"}
                                </span>
                                {comment.is_internal && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-warning/20 px-2 py-0.5 text-[10px] font-extrabold text-warning border border-warning/30">
                                    <Lock className="w-3 h-3" />
                                    Nota Interna de TI
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {new Date(comment.created_at).toLocaleString("pt-BR")}
                              </span>
                            </div>

                            <div className="mt-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* New Interaction / Reply Form */}
            <form onSubmit={handleCommentSubmit} className="pt-6 border-t border-border space-y-4">
              {/* Canned Responses Shortcut Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>Respostas Rápidas Sugeridas:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => insertCannedResponse("Olá! Recebemos sua solicitação e nossa equipe técnica já iniciou a análise.", "IN_PROGRESS")}
                    className="text-[11px] bg-surface-elevated hover:bg-surface-hover border border-border px-2.5 py-1 rounded-lg text-foreground font-medium transition-colors"
                  >
                    🚀 Início de Análise
                  </button>
                  <button
                    type="button"
                    onClick={() => insertCannedResponse("Por gentileza, poderia nos fornecer mais detalhes, print da tela ou a mensagem de erro exata?", "WAITING_USER")}
                    className="text-[11px] bg-surface-elevated hover:bg-surface-hover border border-border px-2.5 py-1 rounded-lg text-foreground font-medium transition-colors"
                  >
                    ❓ Solicitar Mais Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => insertCannedResponse("Agendamos uma visita ao seu setor de trabalho para efetuar a verificação física do equipamento.", "IN_PROGRESS")}
                    className="text-[11px] bg-surface-elevated hover:bg-surface-hover border border-border px-2.5 py-1 rounded-lg text-foreground font-medium transition-colors"
                  >
                    🏢 Agendar Visita Presencial
                  </button>
                  <button
                    type="button"
                    onClick={() => insertCannedResponse("Procedimento concluído com sucesso e testado. Favor verificar o funcionamento no seu terminal.", "RESOLVED")}
                    className="text-[11px] bg-surface-elevated hover:bg-surface-hover border border-border px-2.5 py-1 rounded-lg text-foreground font-medium transition-colors"
                  >
                    ✅ Solução Aplicada
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva uma resposta ao solicitante, atualização de status ou anotação interna..."
                  className={`w-full rounded-xl border p-3.5 text-xs text-foreground focus:ring-2 focus:ring-primary transition-all resize-y ${
                    isInternal 
                      ? "bg-warning/5 border-warning/30 placeholder:text-warning/60" 
                      : "bg-surface-elevated border-border"
                  }`}
                />
              </div>

              {/* Bottom Options & Submit */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-warning">
                      <Lock className="w-3.5 h-3.5" />
                      Nota Interna (Visível apenas para equipe de TI)
                    </span>
                  </label>

                  <div className="flex items-center gap-2 border-l border-border pl-4">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Alterar Status:</label>
                    <select
                      value={commentStatusTarget}
                      onChange={(e) => setCommentStatusTarget(e.target.value)}
                      className="text-xs font-semibold rounded-lg border border-border bg-surface-elevated px-2 py-1 text-foreground"
                    >
                      <option value="NEW">Novo</option>
                      <option value="TRIAGE">Em Triagem</option>
                      <option value="IN_PROGRESS">Em Atendimento</option>
                      <option value="WAITING_USER">Aguardando Usuário</option>
                      <option value="WAITING_VENDOR">Aguardando Fornecedor</option>
                      <option value="RESOLVED">Resolvido</option>
                      <option value="CLOSED">Encerrado</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingComment}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sendingComment ? (
                    "Registrando..."
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Registrar Resposta
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (4 cols): Interactive Sidebar Properties */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* SLA Card */}
          <div className="bg-surface shadow-xs rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Meta de SLA
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                  ? "bg-success/10 text-success border-success/30"
                  : isSlaBreached
                  ? "bg-danger/10 text-danger border-danger/30 animate-pulse"
                  : "bg-info/10 text-info border-info/30"
              }`}>
                {ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "Concluído" : isSlaBreached ? "SLA Excedido" : "Dentro do Prazo"}
              </span>
            </div>

            <div className="bg-surface-elevated p-3.5 rounded-xl border border-border space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Prazo de Resolução:</span>
                <span className="font-bold text-foreground">{slaTargetHours} horas úteis</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Limite Máximo:</span>
                <span className="font-semibold text-foreground">{slaDeadline.toLocaleDateString("pt-BR")} às {slaDeadline.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Core Properties Card */}
          <div className="bg-surface shadow-xs rounded-2xl border border-border p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border flex items-center justify-between">
              <span>Propriedades do Chamado</span>
              {savingProperty && <span className="text-primary text-[10px] lowercase animate-pulse">salvando...</span>}
            </h3>

            {/* Status do Chamado */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                Status do Chamado
              </label>
              <select
                value={status}
                disabled={savingProperty}
                onChange={(e) => updateTicketProperty({ status: e.target.value })}
                className="w-full text-xs font-bold rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-foreground focus:ring-2 focus:ring-primary cursor-pointer shadow-xs transition-colors"
              >
                <option value="NEW">🟢 Novo</option>
                <option value="TRIAGE">🟣 Em Triagem</option>
                <option value="ASSIGNED">🔵 Atribuído / Fila</option>
                <option value="IN_PROGRESS">🟡 Em Atendimento</option>
                <option value="WAITING_USER">🟠 Aguardando Usuário</option>
                <option value="WAITING_VENDOR">🟤 Aguardando Fornecedor</option>
                <option value="RESOLVED">✅ Resolvido</option>
                <option value="CLOSED">⚪ Fechado / Encerrado</option>
                <option value="CANCELED">❌ Cancelado</option>
              </select>
            </div>

            {/* Requester */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                Solicitante
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-surface-elevated rounded-xl border border-border">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {ticket.requester.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">{ticket.requester.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{ticket.requester.email}</div>
                </div>
              </div>
            </div>

            {/* Technician / Assignee */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Técnico Responsável
                </label>
                {currentUser && assignedToId !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => updateTicketProperty({ assigned_to_id: currentUser.id, status: "IN_PROGRESS" })}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    + Assumir Chamado
                  </button>
                )}
              </div>
              <select
                value={assignedToId}
                onChange={(e) => updateTicketProperty({ assigned_to_id: e.target.value })}
                className="w-full text-xs font-medium rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="">Não atribuído (Fila de Atendimento)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => updateTicketProperty({ category_id: e.target.value })}
                className="w-full text-xs font-medium rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="">Sem categoria definida</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                Setor / Grupo Técnico
              </label>
              <select
                value={groupId}
                onChange={(e) => updateTicketProperty({ group_id: e.target.value })}
                className="w-full text-xs font-medium rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="">Triagem Geral N1</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                Prioridade ITIL
              </label>
              <select
                value={priority}
                onChange={(e) => updateTicketProperty({ priority: e.target.value })}
                className="w-full text-xs font-bold rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="CRITICAL">🚨 Crítica</option>
                <option value="HIGH">⚠️ Alta</option>
                <option value="MEDIUM">🔹 Média</option>
                <option value="LOW">⚪ Baixa</option>
              </select>
            </div>

            {/* Asset CMDB */}
            <div className="pt-2 border-t border-border">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                Ativo CMDB Vinculado
              </label>
              <select
                value={assetId}
                onChange={(e) => updateTicketProperty({ asset_id: e.target.value })}
                className="w-full text-xs font-medium rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="">Nenhum ativo vinculado</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.asset_tag || a.internal_id})
                  </option>
                ))}
              </select>

              {ticket.asset && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-surface-elevated border border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-bold text-foreground">{ticket.asset.name}</div>
                      <div className="text-[10px] text-muted-foreground">ID: {ticket.asset.internal_id}</div>
                    </div>
                  </div>
                  <Link
                    href={`/cmdb/${ticket.asset.id}`}
                    className="text-primary hover:underline font-bold text-[11px]"
                  >
                    Ver no CMDB
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
