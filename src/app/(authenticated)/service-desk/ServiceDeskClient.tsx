"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  HeadphonesIcon, Plus, Search, Filter, LayoutGrid, 
  Table as TableIcon, Download, Clock, AlertTriangle, 
  CheckCircle2, UserCheck, ArrowRight, Eye, RefreshCw,
  ShieldAlert, User, Sparkles, Layers, Check, Calendar
} from "lucide-react";

interface Ticket {
  id: string;
  code: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  urgency: string;
  impact: string;
  created_at: string | Date;
  resolved_at?: string | Date | null;
  requester: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  assigned_to?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  } | null;
  category?: {
    id: string;
    name: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  asset?: {
    id: string;
    name: string;
    internal_id: string;
    asset_tag?: string | null;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; border: string }> = {
  NEW: { label: "Novo", badge: "bg-info/10 text-info border-info/30", border: "border-info/40" },
  TRIAGE: { label: "Em Triagem", badge: "bg-purple-500/10 text-purple-400 border-purple-500/30", border: "border-purple-500/40" },
  ASSIGNED: { label: "Atribuído / Fila", badge: "bg-blue-500/10 text-blue-400 border-blue-500/30", border: "border-blue-500/40" },
  IN_PROGRESS: { label: "Em Atendimento", badge: "bg-warning/10 text-warning border-warning/30", border: "border-warning/40" },
  WAITING_USER: { label: "Aguardando Usuário", badge: "bg-orange-500/10 text-orange-400 border-orange-500/30", border: "border-orange-500/40" },
  WAITING_VENDOR: { label: "Aguardando Fornecedor", badge: "bg-amber-600/10 text-amber-500 border-amber-600/30", border: "border-amber-600/40" },
  RESOLVED: { label: "Resolvido", badge: "bg-success/10 text-success border-success/30", border: "border-success/40" },
  CLOSED: { label: "Fechado", badge: "bg-muted text-muted-foreground border-border", border: "border-border" },
  CANCELED: { label: "Cancelado", badge: "bg-danger/10 text-danger border-danger/30", border: "border-danger/40" },
};

const PRIORITY_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  CRITICAL: { label: "Crítica", badge: "bg-danger/10 text-danger border-danger/30 font-bold", dot: "bg-danger" },
  HIGH: { label: "Alta", badge: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" },
  MEDIUM: { label: "Média", badge: "bg-info/10 text-info border-info/30", dot: "bg-info" },
  LOW: { label: "Baixa", badge: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

export default function ServiceDeskClient({
  initialTickets,
  categories,
  currentUser,
}: {
  initialTickets: any[];
  categories: Category[];
  currentUser: CurrentUser | null;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterAssignee, setFilterAssignee] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = tickets.length;
    const newOrTriage = tickets.filter(t => t.status === "NEW" || t.status === "TRIAGE").length;
    const inProgress = tickets.filter(t => t.status === "IN_PROGRESS" || t.status === "ASSIGNED").length;
    const waiting = tickets.filter(t => t.status === "WAITING_USER" || t.status === "WAITING_VENDOR").length;
    const critical = tickets.filter(t => (t.priority === "CRITICAL" || t.priority === "HIGH") && t.status !== "RESOLVED" && t.status !== "CLOSED").length;
    const resolved = tickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length;
    return { total, newOrTriage, inProgress, waiting, critical, resolved };
  }, [tickets]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Search
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const codeMatch = ticket.code.toLowerCase().includes(query);
        const titleMatch = ticket.title.toLowerCase().includes(query);
        const requesterMatch = ticket.requester?.name.toLowerCase().includes(query);
        const assigneeMatch = ticket.assigned_to?.name.toLowerCase().includes(query);
        if (!codeMatch && !titleMatch && !requesterMatch && !assigneeMatch) return false;
      }

      // Status
      if (filterStatus !== "ALL" && ticket.status !== filterStatus) return false;

      // Priority
      if (filterPriority !== "ALL" && ticket.priority !== filterPriority) return false;

      // Type
      if (filterType !== "ALL" && ticket.type !== filterType) return false;

      // Category
      if (filterCategory !== "ALL" && ticket.category?.id !== filterCategory) return false;

      // Assignee
      if (filterAssignee === "MINE") {
        if (!currentUser || ticket.assigned_to?.id !== currentUser.id) return false;
      } else if (filterAssignee === "UNASSIGNED") {
        if (ticket.assigned_to) return false;
      }

      return true;
    });
  }, [tickets, searchQuery, filterStatus, filterPriority, filterType, filterCategory, filterAssignee, currentUser]);

  // Quick Action: Take Ticket ("Assumir Chamado")
  const handleAssignToMe = async (ticketId: string) => {
    if (!currentUser) return;
    setActionLoadingId(ticketId);

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_to_id: currentUser.id,
          status: "IN_PROGRESS"
        })
      });

      if (!res.ok) throw new Error("Erro ao atribuir chamado");

      const updated = await res.json();
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assigned_to: currentUser, status: "IN_PROGRESS" } : t));
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Falha na atribuição");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Advance Status in Kanban
  const handleQuickStatusChange = async (ticketId: string, newStatus: string) => {
    setActionLoadingId(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error("Erro ao alterar status");

      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Falha ao mudar status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      alert("Nenhum chamado para exportar com os filtros atuais.");
      return;
    }

    const headers = ["Código", "Título", "Tipo", "Status", "Prioridade", "Solicitante", "Atendente", "Categoria", "Data de Abertura"];
    const rows = filteredTickets.map(t => [
      t.code,
      `"${t.title.replace(/"/g, '""')}"`,
      t.type === "INCIDENT" ? "Incidente" : "Requisição",
      STATUS_CONFIG[t.status]?.label || t.status,
      PRIORITY_CONFIG[t.priority]?.label || t.priority,
      `"${t.requester?.name || ''}"`,
      `"${t.assigned_to?.name || 'Não atribuído'}"`,
      `"${t.category?.name || 'Geral'}"`,
      new Date(t.created_at).toLocaleString("pt-BR")
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chamados_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Time formatter helper
  const formatTimeAgo = (dateStr: string | Date) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "há poucos minutos";
    if (diffHours === 1) return "há 1 hora";
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return "há 1 dia";
    return `há ${diffDays} dias`;
  };

  // Kanban Columns Definition
  const kanbanColumns = [
    {
      id: "NEW_TRIAGE",
      title: "Novos & Triagem",
      color: "border-info/50 text-info",
      statuses: ["NEW", "TRIAGE"],
    },
    {
      id: "ASSIGNED",
      title: "Fila / Atribuídos",
      color: "border-blue-500/50 text-blue-400",
      statuses: ["ASSIGNED"],
    },
    {
      id: "IN_PROGRESS",
      title: "Em Atendimento",
      color: "border-warning/50 text-warning",
      statuses: ["IN_PROGRESS"],
    },
    {
      id: "WAITING",
      title: "Aguardando Resposta",
      color: "border-orange-500/50 text-orange-400",
      statuses: ["WAITING_USER", "WAITING_VENDOR"],
    },
    {
      id: "RESOLVED_CLOSED",
      title: "Resolvidos & Encerrados",
      color: "border-success/50 text-success",
      statuses: ["RESOLVED", "CLOSED"],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-4 sm:p-6 rounded-2xl border border-border shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <HeadphonesIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Service Desk / Chamados</h1>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-none">
                Central de atendimento ITIL para gestão de incidentes, requisições e suporte técnico.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-surface-elevated hover:bg-surface-hover text-foreground px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold border border-border transition-colors shadow-xs"
            title="Exportar dados para planilha CSV"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            <span>Exportar CSV</span>
          </button>

          <Link
            href="/service-desk/new"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-primary text-primary-foreground px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>+ Abrir Chamado</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        <div 
          onClick={() => { setFilterStatus("ALL"); setFilterPriority("ALL"); setFilterAssignee("ALL"); }}
          className="bg-surface hover:bg-surface-hover p-3 sm:p-4 rounded-xl border border-border transition-all cursor-pointer shadow-xs"
        >
          <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase">
            <span>Total</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground">{metrics.total}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Todos os chamados</div>
        </div>

        <div 
          onClick={() => setFilterStatus("NEW")}
          className="bg-surface hover:bg-surface-hover p-4 rounded-xl border border-border transition-all cursor-pointer shadow-xs"
        >
          <div className="flex justify-between items-center text-xs font-bold text-info uppercase">
            <span>Novos / Triagem</span>
            <Clock className="w-4 h-4 text-info" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-info">{metrics.newOrTriage}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Aguardando início</div>
        </div>

        <div 
          onClick={() => setFilterStatus("IN_PROGRESS")}
          className="bg-surface hover:bg-surface-hover p-4 rounded-xl border border-border transition-all cursor-pointer shadow-xs"
        >
          <div className="flex justify-between items-center text-xs font-bold text-warning uppercase">
            <span>Em Atendimento</span>
            <UserCheck className="w-4 h-4 text-warning" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-warning">{metrics.inProgress}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Em resolução</div>
        </div>

        <div 
          onClick={() => setFilterStatus("WAITING_USER")}
          className="bg-surface hover:bg-surface-hover p-4 rounded-xl border border-border transition-all cursor-pointer shadow-xs"
        >
          <div className="flex justify-between items-center text-xs font-bold text-orange-400 uppercase">
            <span>Aguardando</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-orange-400">{metrics.waiting}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Usuário / Terceiros</div>
        </div>

        <div 
          onClick={() => setFilterPriority("CRITICAL")}
          className="bg-surface hover:bg-surface-hover p-4 rounded-xl border border-border transition-all cursor-pointer shadow-xs"
        >
          <div className="flex justify-between items-center text-xs font-bold text-danger uppercase">
            <span>Críticos / Alta</span>
            <ShieldAlert className="w-4 h-4 text-danger" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-danger">{metrics.critical}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Atenção imediata</div>
        </div>

        <div 
          onClick={() => setFilterStatus("RESOLVED")}
          className="bg-surface hover:bg-surface-hover p-4 rounded-xl border border-border transition-all cursor-pointer shadow-xs"
        >
          <div className="flex justify-between items-center text-xs font-bold text-success uppercase">
            <span>Resolvidos</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-success">{metrics.resolved}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Concluídos com êxito</div>
        </div>
      </div>

      {/* Control Bar: Search, Filters and View Toggle */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código (CH-...), título, solicitante ou atendente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface-elevated text-foreground text-xs font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick View Toggle (Table vs Kanban) */}
          <div className="flex items-center gap-1.5 bg-surface-elevated p-1 rounded-xl border border-border self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-border">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Todos os Status</option>
              <option value="NEW">Novos</option>
              <option value="TRIAGE">Em Triagem</option>
              <option value="ASSIGNED">Atribuídos</option>
              <option value="IN_PROGRESS">Em Atendimento</option>
              <option value="WAITING_USER">Aguardando Usuário</option>
              <option value="WAITING_VENDOR">Aguardando Fornecedor</option>
              <option value="RESOLVED">Resolvidos</option>
              <option value="CLOSED">Fechados</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Prioridade
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Todas as Prioridades</option>
              <option value="CRITICAL">🚨 Crítica</option>
              <option value="HIGH">⚠️ Alta</option>
              <option value="MEDIUM">🔹 Média</option>
              <option value="LOW">⚪ Baixa</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="INCIDENT">Incidentes</option>
              <option value="REQUEST">Requisições</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Atendente
            </label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Todos os Atendentes</option>
              <option value="MINE">👤 Meus Chamados</option>
              <option value="UNASSIGNED">⚠️ Não Atribuídos (Fila)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Categoria
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW: Table Mode */}
      {viewMode === "table" && (
        <div className="bg-surface shadow-xs border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Código</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Assunto & Resumo</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Prioridade</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Solicitante</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Responsável</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Abertura</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <HeadphonesIcon className="w-10 h-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-semibold text-foreground">Nenhum chamado encontrado</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          Não foram localizados registros com os filtros atuais. Experimente limpar os filtros ou abrir um novo chamado.
                        </p>
                        <Link
                          href="/service-desk/new"
                          className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors"
                        >
                          + Abrir Novo Chamado
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const statusInfo = STATUS_CONFIG[ticket.status] || { label: ticket.status, badge: "bg-muted text-muted-foreground border-border" };
                    const priorityInfo = PRIORITY_CONFIG[ticket.priority] || { label: ticket.priority, badge: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
                    
                    return (
                      <tr key={ticket.id} className="hover:bg-surface-hover/70 transition-colors group">
                        {/* Code */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <Link href={`/service-desk/${ticket.id}`} className="font-mono text-xs font-bold text-primary hover:underline">
                            {ticket.code}
                          </Link>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                            {ticket.type === "INCIDENT" ? "Incidente" : "Requisição"}
                          </div>
                        </td>

                        {/* Title & Description */}
                        <td className="px-5 py-4">
                          <Link href={`/service-desk/${ticket.id}`} className="font-bold text-sm text-foreground hover:text-primary transition-colors block line-clamp-1">
                            {ticket.title}
                          </Link>
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {ticket.description}
                          </div>
                          {ticket.category && (
                            <span className="inline-block mt-1 text-[10px] font-semibold text-muted-foreground bg-surface-elevated border border-border px-1.5 py-0.5 rounded">
                              {ticket.category.name}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <select
                            value={ticket.status}
                            disabled={actionLoadingId === ticket.id}
                            onChange={(e) => handleQuickStatusChange(ticket.id, e.target.value)}
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold border cursor-pointer focus:ring-2 focus:ring-primary shadow-xs transition-all ${statusInfo.badge}`}
                            title="Clique para alterar status imediatamente"
                          >
                            <option value="NEW" className="bg-surface text-foreground font-semibold">Novo</option>
                            <option value="TRIAGE" className="bg-surface text-foreground font-semibold">Em Triagem</option>
                            <option value="ASSIGNED" className="bg-surface text-foreground font-semibold">Atribuído / Fila</option>
                            <option value="IN_PROGRESS" className="bg-surface text-foreground font-semibold">Em Atendimento</option>
                            <option value="WAITING_USER" className="bg-surface text-foreground font-semibold">Aguardando Usuário</option>
                            <option value="WAITING_VENDOR" className="bg-surface text-foreground font-semibold">Aguardando Fornecedor</option>
                            <option value="RESOLVED" className="bg-surface text-foreground font-semibold">Resolvido</option>
                            <option value="CLOSED" className="bg-surface text-foreground font-semibold">Fechado</option>
                            <option value="CANCELED" className="bg-surface text-foreground font-semibold">Cancelado</option>
                          </select>
                        </td>

                        {/* Priority */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${priorityInfo.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
                            {priorityInfo.label}
                          </span>
                        </td>

                        {/* Requester */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {ticket.requester.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-foreground line-clamp-1">{ticket.requester.name}</div>
                              <div className="text-[10px] text-muted-foreground">{ticket.requester.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Assignee */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {ticket.assigned_to ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <div className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center text-[10px] font-bold">
                                {ticket.assigned_to.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="line-clamp-1">{ticket.assigned_to.name}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoadingId === ticket.id}
                              onClick={() => handleAssignToMe(ticket.id)}
                              className="text-[11px] font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2 py-1 rounded-md transition-colors"
                            >
                              {actionLoadingId === ticket.id ? "Atribuindo..." : "+ Assumir"}
                            </button>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-muted-foreground">
                          <div>{new Date(ticket.created_at).toLocaleDateString("pt-BR")}</div>
                          <div className="text-[10px] text-muted-foreground">{formatTimeAgo(ticket.created_at)}</div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/service-desk/${ticket.id}`}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Visualizar chamado"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: Kanban Mode */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colTickets = filteredTickets.filter(t => col.statuses.includes(t.status));

            return (
              <div 
                key={col.id} 
                className="bg-surface rounded-2xl border border-border p-3.5 flex flex-col min-h-[500px] shadow-xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full border-2 ${col.color}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {col.title}
                    </h3>
                  </div>
                  <span className="text-xs font-extrabold text-muted-foreground bg-surface-elevated px-2 py-0.5 rounded-full border border-border">
                    {colTickets.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
                  {colTickets.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground border-2 border-dashed border-border rounded-xl">
                      Nenhum chamado
                    </div>
                  ) : (
                    colTickets.map((ticket) => {
                      const priorityInfo = PRIORITY_CONFIG[ticket.priority] || { label: ticket.priority, badge: "bg-muted text-muted-foreground border-border" };

                      return (
                        <div
                          key={ticket.id}
                          className="bg-surface-elevated hover:border-primary/40 p-4 rounded-xl border border-border shadow-xs transition-all space-y-2.5 group"
                        >
                          {/* Card Top: Code, Type & Priority */}
                          <div className="flex items-center justify-between gap-1">
                            <Link 
                              href={`/service-desk/${ticket.id}`} 
                              className="font-mono text-xs font-bold text-primary hover:underline"
                            >
                              {ticket.code}
                            </Link>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${priorityInfo.badge}`}>
                              {priorityInfo.label}
                            </span>
                          </div>

                          {/* Card Title */}
                          <Link 
                            href={`/service-desk/${ticket.id}`} 
                            className="text-xs font-bold text-foreground hover:text-primary transition-colors block line-clamp-2"
                          >
                            {ticket.title}
                          </Link>

                          {/* Category Tag */}
                          {ticket.category && (
                            <div className="text-[10px] font-semibold text-muted-foreground bg-surface px-2 py-0.5 rounded border border-border inline-block">
                              {ticket.category.name}
                            </div>
                          )}

                          {/* Requester & Time */}
                          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="line-clamp-1 font-medium">{ticket.requester.name}</span>
                            <span className="shrink-0">{formatTimeAgo(ticket.created_at)}</span>
                          </div>

                          {/* Assignee & Fast Advance */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            {ticket.assigned_to ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                                <div className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center text-[9px]">
                                  {ticket.assigned_to.name.charAt(0)}
                                </div>
                                <span className="line-clamp-1">{ticket.assigned_to.name}</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleAssignToMe(ticket.id)}
                                className="text-[10px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded border border-primary/20 transition-colors"
                              >
                                + Assumir
                              </button>
                            )}

                            {/* Status Quick Flow Advance */}
                            {ticket.status === "NEW" && (
                              <button
                                type="button"
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleQuickStatusChange(ticket.id, "IN_PROGRESS")}
                                className="text-[10px] font-bold text-warning hover:bg-warning/10 px-2 py-1 rounded border border-warning/20 transition-colors ml-auto"
                                title="Iniciar atendimento"
                              >
                                Iniciar
                              </button>
                            )}
                            {ticket.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleQuickStatusChange(ticket.id, "RESOLVED")}
                                className="text-[10px] font-bold text-success hover:bg-success/10 px-2 py-1 rounded border border-success/20 transition-colors ml-auto"
                                title="Marcar como resolvido"
                              >
                                Resolver
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
