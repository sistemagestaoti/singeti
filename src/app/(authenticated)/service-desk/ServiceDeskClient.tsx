"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  HeadphonesIcon, Plus, Search, Filter, LayoutGrid, 
  Table as TableIcon, Download, Clock, AlertTriangle, 
  CheckCircle2, UserCheck, ArrowRight, Eye, RefreshCw,
  ShieldAlert, User, Sparkles, Layers, Check, Calendar,
  BarChart3, FileSpreadsheet, FileText, PieChart, TrendingUp, SlidersHorizontal,
  CalendarDays, CalendarRange, RotateCcw, X, ChevronDown, ChevronUp
} from "lucide-react";
import ServiceDeskExportModal from "@/components/ServiceDeskExportModal";
import { 
  exportTicketsToPDF, 
  exportTicketsToExcel, 
  exportTicketsToCSV, 
  formatDateOnly, 
  formatTimeOnly, 
  calculateDuration 
} from "@/lib/ticketReports";

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
  closed_at?: string | Date | null;
  requester_name?: string | null;
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
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
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

const MONTHS = [
  { value: "01", label: "01 - Janeiro" },
  { value: "02", label: "02 - Fevereiro" },
  { value: "03", label: "03 - Março" },
  { value: "04", label: "04 - Abril" },
  { value: "05", label: "05 - Maio" },
  { value: "06", label: "06 - Junho" },
  { value: "07", label: "07 - Julho" },
  { value: "08", label: "08 - Agosto" },
  { value: "09", label: "09 - Setembro" },
  { value: "10", label: "10 - Outubro" },
  { value: "11", label: "11 - Novembro" },
  { value: "12", label: "12 - Dezembro" },
];

export default function ServiceDeskClient({
  initialTickets,
  categories,
  currentUser,
  departments = [],
  attendants = [],
}: {
  initialTickets: any[];
  categories: Category[];
  currentUser: CurrentUser | null;
  departments?: { id: string; name: string }[];
  attendants?: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "reports">("table");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<"TODAY" | "LAST_7_DAYS" | "THIS_MONTH" | "LAST_30_DAYS" | "ALL">("THIS_MONTH");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterAssignee, setFilterAssignee] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Controle do Redesign Clean & Compact
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);

  // Datas e período de referência (Mês atual por padrão)
  const now = useMemo(() => new Date(), []);
  const currentYearStr = useMemo(() => now.getFullYear().toString(), [now]);
  const currentMonthStr = useMemo(() => (now.getMonth() + 1).toString().padStart(2, "0"), [now]);

  // Contagem de filtros ativos para badge compacto
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== "ALL") count++;
    if (filterPriority !== "ALL") count++;
    if (filterType !== "ALL") count++;
    if (filterAssignee !== "ALL") count++;
    if (filterCategory !== "ALL") count++;
    return count;
  }, [filterStatus, filterPriority, filterType, filterAssignee, filterCategory]);

  // Filtros Temporais (Mês inicial por padrão, filtros de ano e dias)
  const [filterYear, setFilterYear] = useState<string>(currentYearStr);
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthStr);
  const [filterDayRange, setFilterDayRange] = useState<string>("ALL_MONTH");
  const [filterSpecificDate, setFilterSpecificDate] = useState<string>("");
  const [filterCustomStart, setFilterCustomStart] = useState<string>("");
  const [filterCustomEnd, setFilterCustomEnd] = useState<string>("");

  const hasActiveFilters = useMemo(() => {
    return (
      activeFiltersCount > 0 ||
      searchQuery.trim() !== "" ||
      filterYear !== currentYearStr ||
      filterMonth !== currentMonthStr ||
      filterDayRange !== "ALL_MONTH"
    );
  }, [activeFiltersCount, searchQuery, filterYear, currentYearStr, filterMonth, currentMonthStr, filterDayRange]);

  const handleResetToCurrentMonth = () => {
    setFilterYear(currentYearStr);
    setFilterMonth(currentMonthStr);
    setFilterDayRange("ALL_MONTH");
    setFilterSpecificDate("");
    setFilterCustomStart("");
    setFilterCustomEnd("");
  };

  const handleClearDateFilters = () => {
    setFilterYear("ALL");
    setFilterMonth("ALL");
    setFilterDayRange("ALL_TIME");
    setFilterSpecificDate("");
    setFilterCustomStart("");
    setFilterCustomEnd("");
  };

  const handleClearAllFilters = () => {
    handleResetToCurrentMonth();
    setSearchQuery("");
    setFilterStatus("ALL");
    setFilterPriority("ALL");
    setFilterType("ALL");
    setFilterAssignee("ALL");
    setFilterCategory("ALL");
  };

  // Coleta anos disponíveis a partir dos chamados carregados
  const availableYears = useMemo(() => {
    const currentY = now.getFullYear();
    const yearSet = new Set<string>([currentY.toString()]);
    tickets.forEach(t => {
      if (t.created_at) {
        const y = new Date(t.created_at).getFullYear().toString();
        if (!isNaN(Number(y))) yearSet.add(y);
      }
    });
    yearSet.add((currentY - 1).toString());
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [tickets, now]);

  // Filtro de Data (Ano, Mês e Dias)
  const dateFilteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const tDate = new Date(ticket.created_at);
      const tYear = tDate.getFullYear().toString();
      const tMonth = (tDate.getMonth() + 1).toString().padStart(2, "0");
      const tDay = tDate.getDate().toString().padStart(2, "0");
      const tYMD = `${tYear}-${tMonth}-${tDay}`;

      // 1. Filtro de Ano
      if (filterYear !== "ALL" && tYear !== filterYear) {
        return false;
      }

      // 2. Filtro de Mês
      if (filterMonth !== "ALL" && tMonth !== filterMonth) {
        return false;
      }

      // 3. Filtro de Dias / Período
      if (filterDayRange === "TODAY") {
        const todayYMD = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
        if (tYMD !== todayYMD) return false;
      } else if (filterDayRange === "YESTERDAY") {
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        const yestYMD = `${yest.getFullYear()}-${(yest.getMonth() + 1).toString().padStart(2, "0")}-${yest.getDate().toString().padStart(2, "0")}`;
        if (tYMD !== yestYMD) return false;
      } else if (filterDayRange === "LAST_7_DAYS") {
        const diffMs = now.getTime() - tDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (filterDayRange === "LAST_15_DAYS") {
        const diffMs = now.getTime() - tDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 15) return false;
      } else if (filterDayRange === "LAST_30_DAYS") {
        const diffMs = now.getTime() - tDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 30) return false;
      } else if (filterDayRange === "SPECIFIC_DAY") {
        if (filterSpecificDate && tYMD !== filterSpecificDate) return false;
      } else if (filterDayRange === "CUSTOM") {
        if (filterCustomStart && tYMD < filterCustomStart) return false;
        if (filterCustomEnd && tYMD > filterCustomEnd) return false;
      }

      return true;
    });
  }, [tickets, filterYear, filterMonth, filterDayRange, filterSpecificDate, filterCustomStart, filterCustomEnd, now]);

  // Rótulo textual do período ativo
  const activePeriodLabel = useMemo(() => {
    if (filterDayRange === "TODAY") {
      return `Hoje (${now.toLocaleDateString("pt-BR")})`;
    }
    if (filterDayRange === "YESTERDAY") {
      return "Ontem";
    }
    if (filterDayRange === "LAST_7_DAYS") {
      return "Últimos 7 dias";
    }
    if (filterDayRange === "LAST_15_DAYS") {
      return "Últimos 15 dias";
    }
    if (filterDayRange === "LAST_30_DAYS") {
      return "Últimos 30 dias";
    }
    if (filterDayRange === "SPECIFIC_DAY" && filterSpecificDate) {
      const parts = filterSpecificDate.split("-");
      if (parts.length === 3) return `Dia ${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (filterDayRange === "CUSTOM" && (filterCustomStart || filterCustomEnd)) {
      return `Período: ${filterCustomStart ? filterCustomStart.split("-").reverse().join("/") : "Início"} até ${filterCustomEnd ? filterCustomEnd.split("-").reverse().join("/") : "Hoje"}`;
    }
    if (filterYear === "ALL" && filterMonth === "ALL") {
      return "Todo o Histórico";
    }
    const monthObj = MONTHS.find(m => m.value === filterMonth);
    const monthName = monthObj ? monthObj.label.split(" - ")[1] : filterMonth;
    if (filterMonth !== "ALL" && filterYear !== "ALL") {
      const isCurrent = filterYear === currentYearStr && filterMonth === currentMonthStr;
      return `${monthName}/${filterYear}${isCurrent ? " (Mês Atual)" : ""}`;
    }
    if (filterMonth !== "ALL" && filterYear === "ALL") {
      return `Todos os anos • Mês de ${monthName}`;
    }
    return `Ano de ${filterYear} • Todos os meses`;
  }, [filterDayRange, filterSpecificDate, filterCustomStart, filterCustomEnd, filterYear, filterMonth, now, currentYearStr, currentMonthStr]);

  // Compute Metrics baseados no dateFilteredTickets
  const metrics = useMemo(() => {
    const total = dateFilteredTickets.length;
    const newOrTriage = dateFilteredTickets.filter(t => t.status === "NEW" || t.status === "TRIAGE").length;
    const inProgress = dateFilteredTickets.filter(t => t.status === "IN_PROGRESS" || t.status === "ASSIGNED").length;
    const waiting = dateFilteredTickets.filter(t => t.status === "WAITING_USER" || t.status === "WAITING_VENDOR").length;
    const critical = dateFilteredTickets.filter(t => (t.priority === "CRITICAL" || t.priority === "HIGH") && t.status !== "RESOLVED" && t.status !== "CLOSED").length;
    const resolved = dateFilteredTickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length;
    return { total, newOrTriage, inProgress, waiting, critical, resolved };
  }, [dateFilteredTickets]);

  // Filtragem e cálculos para a aba de Relatórios & Indicadores
  const reportFilteredTickets = useMemo(() => {
    if (reportPeriod === "ALL") return tickets;
    const now = new Date();
    let cutoff = new Date();

    if (reportPeriod === "TODAY") {
      cutoff.setHours(0, 0, 0, 0);
    } else if (reportPeriod === "LAST_7_DAYS") {
      cutoff.setDate(now.getDate() - 7);
    } else if (reportPeriod === "THIS_MONTH") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (reportPeriod === "LAST_30_DAYS") {
      cutoff.setDate(now.getDate() - 30);
    }

    return tickets.filter(t => new Date(t.created_at) >= cutoff);
  }, [tickets, reportPeriod]);

  const reportStats = useMemo(() => {
    const list = reportFilteredTickets;
    const total = list.length;
    const resolved = list.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length;
    const open = total - resolved;
    const critical = list.filter(t => t.priority === "CRITICAL" || t.priority === "HIGH").length;
    const incidents = list.filter(t => t.type === "INCIDENT").length;
    const requests = list.filter(t => t.type === "REQUEST").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Tempo médio de resolução (horas)
    const resolvedWithDates = list.filter(t => t.resolved_at && (t.status === "RESOLVED" || t.status === "CLOSED"));
    let avgResolutionHours = 0;
    if (resolvedWithDates.length > 0) {
      const totalMs = resolvedWithDates.reduce((acc, t) => {
        const ms = new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime();
        return acc + (ms > 0 ? ms : 0);
      }, 0);
      avgResolutionHours = Math.round(totalMs / resolvedWithDates.length / (1000 * 60 * 60));
    }

    // Distribuição por Status
    const statusCounts: Record<string, number> = {};
    Object.keys(STATUS_CONFIG).forEach(k => { statusCounts[k] = 0; });
    list.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    // Distribuição por Categoria
    const catMap: Record<string, number> = {};
    list.forEach(t => {
      const cName = t.category?.name || "Geral";
      catMap[cName] = (catMap[cName] || 0) + 1;
    });
    const sortedCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    // Distribuição por Prioridade
    const priorityCounts: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    list.forEach(t => {
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority] += 1;
      }
    });

    // Performance por Atendente
    const attendantMap: Record<string, { name: string; total: number; resolved: number }> = {};
    list.forEach(t => {
      const aName = t.assigned_to_name || t.assigned_to?.name || "Não atribuído";
      if (!attendantMap[aName]) attendantMap[aName] = { name: aName, total: 0, resolved: 0 };
      attendantMap[aName].total += 1;
      if (t.status === "RESOLVED" || t.status === "CLOSED") {
        attendantMap[aName].resolved += 1;
      }
    });
    const sortedAttendants = Object.values(attendantMap).sort((a, b) => b.total - a.total);

    return {
      total,
      resolved,
      open,
      critical,
      incidents,
      requests,
      resolutionRate,
      avgResolutionHours,
      statusCounts,
      sortedCategories,
      priorityCounts,
      sortedAttendants,
    };
  }, [reportFilteredTickets]);

  // Filtered Tickets (combina o período selecionado com os filtros operacionais)
  const filteredTickets = useMemo(() => {
    return dateFilteredTickets.filter(ticket => {
      // Search
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const codeMatch = ticket.code?.toLowerCase().includes(query);
        const titleMatch = ticket.title?.toLowerCase().includes(query);
        const requesterMatch = (ticket.requester_name || ticket.requester?.name)?.toLowerCase().includes(query);
        const assigneeMatch = (ticket.assigned_to_name || ticket.assigned_to?.name)?.toLowerCase().includes(query);
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
        if (!currentUser || (ticket.assigned_to?.id !== currentUser.id && ticket.assigned_to_name !== currentUser.name)) return false;
      } else if (filterAssignee === "UNASSIGNED") {
        if (ticket.assigned_to_id || ticket.assigned_to_name || ticket.assigned_to) return false;
      }

      return true;
    });
  }, [dateFilteredTickets, searchQuery, filterStatus, filterPriority, filterType, filterCategory, filterAssignee, currentUser]);

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
          assigned_to_name: currentUser.name,
          status: "IN_PROGRESS"
        })
      });

      if (!res.ok) throw new Error("Erro ao atribuir chamado");

      const updated = await res.json();
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assigned_to: currentUser, assigned_to_name: currentUser.name, status: "IN_PROGRESS" } : t));
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
      `"${t.assigned_to_name || t.assigned_to?.name || 'Não atribuído'}"`,
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
    <div className="flex flex-col gap-3.5">
      
      {/* 1. Top Header Bar Compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pt-0.5 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <HeadphonesIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <span>Service Desk / Chamados</span>
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Central ITIL para incidentes, requisições e suporte técnico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-surface hover:bg-surface-hover text-foreground px-3 py-1.5 rounded-xl text-xs font-semibold border border-border transition-colors shadow-2xs"
            title="Exportar chamados em PDF, Excel (.xlsx) ou CSV com filtros"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Exportar & Relatórios</span>
          </button>

          <Link
            href="/service-desk/new"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Abrir Chamado</span>
          </Link>
        </div>
      </div>

      {/* 2. Faixa Horizontal de Indicadores Compactos (Single-Row Strip) */}
      <div className="bg-surface border border-border rounded-xl p-1 shadow-2xs overflow-x-auto custom-scrollbar">
        <div className="flex items-center divide-x divide-border/60 min-w-max sm:min-w-0 sm:grid sm:grid-cols-6 sm:divide-x sm:divide-border/60">
          
          {/* Total */}
          <button
            type="button"
            onClick={() => { setFilterStatus("ALL"); setFilterPriority("ALL"); setFilterAssignee("ALL"); }}
            className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-hover rounded-lg transition-colors text-left flex-1 ${
              filterStatus === "ALL" && filterPriority === "ALL" && filterAssignee === "ALL" ? "bg-primary/5" : ""
            }`}
            title="Ver todos os chamados do período"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="text-sm font-extrabold text-foreground leading-none mt-0.5">{metrics.total}</div>
            </div>
          </button>

          {/* Novos / Triagem */}
          <button
            type="button"
            onClick={() => setFilterStatus("NEW")}
            className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-hover rounded-lg transition-colors text-left flex-1 ${
              filterStatus === "NEW" ? "bg-info/10 font-bold" : ""
            }`}
            title="Filtrar chamados Novos ou em Triagem"
          >
            <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-info">Novos</div>
              <div className="text-sm font-extrabold text-info leading-none mt-0.5">{metrics.newOrTriage}</div>
            </div>
          </button>

          {/* Em Atendimento */}
          <button
            type="button"
            onClick={() => setFilterStatus("IN_PROGRESS")}
            className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-hover rounded-lg transition-colors text-left flex-1 ${
              filterStatus === "IN_PROGRESS" ? "bg-warning/10 font-bold" : ""
            }`}
            title="Filtrar chamados Em Atendimento"
          >
            <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-warning">Atendimento</div>
              <div className="text-sm font-extrabold text-warning leading-none mt-0.5">{metrics.inProgress}</div>
            </div>
          </button>

          {/* Aguardando */}
          <button
            type="button"
            onClick={() => setFilterStatus("WAITING_USER")}
            className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-hover rounded-lg transition-colors text-left flex-1 ${
              filterStatus === "WAITING_USER" ? "bg-orange-500/10 font-bold" : ""
            }`}
            title="Filtrar chamados Aguardando Resposta"
          >
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Aguardando</div>
              <div className="text-sm font-extrabold text-orange-400 leading-none mt-0.5">{metrics.waiting}</div>
            </div>
          </button>

          {/* Críticos / Alta */}
          <button
            type="button"
            onClick={() => setFilterPriority("CRITICAL")}
            className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-hover rounded-lg transition-colors text-left flex-1 ${
              filterPriority === "CRITICAL" ? "bg-danger/10 font-bold" : ""
            }`}
            title="Filtrar chamados Críticos / Alta Prioridade"
          >
            <div className="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center text-danger shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-danger">Críticos</div>
              <div className="text-sm font-extrabold text-danger leading-none mt-0.5">{metrics.critical}</div>
            </div>
          </button>

          {/* Resolvidos */}
          <button
            type="button"
            onClick={() => setFilterStatus("RESOLVED")}
            className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-hover rounded-lg transition-colors text-left flex-1 ${
              filterStatus === "RESOLVED" ? "bg-success/10 font-bold" : ""
            }`}
            title="Filtrar chamados Resolvidos / Fechados"
          >
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center text-success shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-success">Resolvidos</div>
              <div className="text-sm font-extrabold text-success leading-none mt-0.5">{metrics.resolved}</div>
            </div>
          </button>

        </div>
      </div>

      {/* 3. Barra de Ferramentas Compacta em Níveis (Busca, Período, Filtros Expansíveis e Visualização) */}
      <div className="bg-surface p-2.5 rounded-xl border border-border shadow-2xs space-y-2">
        
        {/* Nível 1: Linha Principal de Ações */}
        <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center justify-between">
          
          {/* Campo de Busca Rápida */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, assunto, solicitante ou atendente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* Controles da Direita: Período Compacto, Botão Filtros e Modo de Visualização */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            
            {/* Seletor Compacto de Período (Dropdown / Popover) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isPeriodMenuOpen
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background hover:bg-surface-hover text-foreground border-border"
                }`}
                title="Alterar período de exibição"
              >
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span className="truncate max-w-[150px] sm:max-w-[180px]">{activePeriodLabel}</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isPeriodMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Popover de Configuração de Período */}
              {isPeriodMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-surface border border-border rounded-2xl shadow-2xl p-3.5 z-40 space-y-3 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-primary" />
                      Configurar Período
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPeriodMenuOpen(false)}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { handleResetToCurrentMonth(); setIsPeriodMenuOpen(false); }}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                        filterYear === currentYearStr && filterMonth === currentMonthStr && filterDayRange === "ALL_MONTH"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      Mês Atual
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleClearDateFilters(); setIsPeriodMenuOpen(false); }}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                        filterYear === "ALL" && filterMonth === "ALL"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      Todo o Histórico
                    </button>
                  </div>

                  {/* Selects: Ano e Mês */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Ano
                      </label>
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-full text-xs font-semibold rounded-lg border border-border bg-background px-2 py-1.5 text-foreground"
                      >
                        <option value="ALL">Todos os Anos</option>
                        {availableYears.map(yr => (
                          <option key={yr} value={yr}>
                            {yr} {yr === currentYearStr ? "(Atual)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Mês
                      </label>
                      <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full text-xs font-semibold rounded-lg border border-border bg-background px-2 py-1.5 text-foreground"
                      >
                        <option value="ALL">Todos os Meses</option>
                        {MONTHS.map(m => (
                          <option key={m.value} value={m.value}>
                            {m.label.split(" - ")[1]} {filterYear === currentYearStr && m.value === currentMonthStr ? "(Atual)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dias / Recorte */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Dias / Recorte
                    </label>
                    <select
                      value={filterDayRange}
                      onChange={(e) => setFilterDayRange(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground"
                    >
                      <option value="ALL_MONTH">Mês Completo (Padrão)</option>
                      <option value="TODAY">Hoje</option>
                      <option value="YESTERDAY">Ontem</option>
                      <option value="LAST_7_DAYS">Últimos 7 dias</option>
                      <option value="LAST_15_DAYS">Últimos 15 dias</option>
                      <option value="LAST_30_DAYS">Últimos 30 dias</option>
                      <option value="SPECIFIC_DAY">Dia Específico...</option>
                      <option value="CUSTOM">Faixa de Datas (De / Até)...</option>
                    </select>
                  </div>

                  {filterDayRange === "SPECIFIC_DAY" && (
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground mb-1">Escolha a Data:</label>
                      <input
                        type="date"
                        value={filterSpecificDate}
                        onChange={(e) => setFilterSpecificDate(e.target.value)}
                        className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground"
                      />
                    </div>
                  )}

                  {filterDayRange === "CUSTOM" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">De:</label>
                        <input
                          type="date"
                          value={filterCustomStart}
                          onChange={(e) => setFilterCustomStart(e.target.value)}
                          className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">Até:</label>
                        <input
                          type="date"
                          value={filterCustomEnd}
                          onChange={(e) => setFilterCustomEnd(e.target.value)}
                          className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsPeriodMenuOpen(false)}
                      className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover"
                    >
                      Aplicar Período
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Filtros Operacionais Expansíveis */}
            <button
              type="button"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isFiltersOpen || activeFiltersCount > 0
                  ? "bg-primary/10 border-primary/30 text-primary font-bold shadow-2xs"
                  : "bg-background hover:bg-surface-hover text-foreground border-border"
              }`}
              title="Expandir ou recolher filtros operacionais"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isFiltersOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Alternador de Visualização: Tabela, Kanban, Relatórios */}
            <div className="flex items-center gap-0.5 bg-background p-0.5 rounded-xl border border-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "table"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Tabela"
              >
                <TableIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Tabela</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "kanban"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Kanban"
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("reports")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "reports"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização de Relatórios & SLAs"
              >
                <BarChart3 className="w-3 h-3" />
                <span className="hidden sm:inline">Relatórios</span>
              </button>
            </div>

          </div>
        </div>

        {/* Nível 2: Painel Expansível de Filtros Operacionais */}
        {isFiltersOpen && (
          <div className="pt-2.5 border-t border-border animate-in fade-in slide-in-from-top-1 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-muted-foreground uppercase tracking-wider">
                Filtros Operacionais Avançados:
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("ALL");
                    setFilterPriority("ALL");
                    setFilterType("ALL");
                    setFilterAssignee("ALL");
                    setFilterCategory("ALL");
                  }}
                  className="text-primary hover:underline font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Redefinir filtros</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
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

              {/* Prioridade */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Prioridade
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Todas as Prioridades</option>
                  <option value="CRITICAL">🚨 Crítica</option>
                  <option value="HIGH">⚠️ Alta</option>
                  <option value="MEDIUM">🔹 Média</option>
                  <option value="LOW">⚪ Baixa</option>
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Tipo
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="INCIDENT">Incidentes</option>
                  <option value="REQUEST">Requisições</option>
                </select>
              </div>

              {/* Atendente */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Atendente
                </label>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Todos os Atendentes</option>
                  <option value="MINE">👤 Meus Chamados</option>
                  <option value="UNASSIGNED">⚠️ Não Atribuídos (Fila)</option>
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Categoria
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Pílulas de Filtros Ativos (Active Filter Chips com remoção individual) */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-border flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase mr-0.5">Filtros:</span>
            
            {/* Chip de Busca */}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                <span>Busca: &quot;{searchQuery}&quot;</span>
                <button type="button" onClick={() => setSearchQuery("")} className="hover:opacity-75">✕</button>
              </span>
            )}

            {/* Chip de Status */}
            {filterStatus !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-elevated text-foreground border border-border text-[11px] font-medium">
                <span>Status: {STATUS_CONFIG[filterStatus]?.label || filterStatus}</span>
                <button type="button" onClick={() => setFilterStatus("ALL")} className="hover:opacity-75">✕</button>
              </span>
            )}

            {/* Chip de Prioridade */}
            {filterPriority !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-elevated text-foreground border border-border text-[11px] font-medium">
                <span>Prioridade: {PRIORITY_CONFIG[filterPriority]?.label || filterPriority}</span>
                <button type="button" onClick={() => setFilterPriority("ALL")} className="hover:opacity-75">✕</button>
              </span>
            )}

            {/* Chip de Tipo */}
            {filterType !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-elevated text-foreground border border-border text-[11px] font-medium">
                <span>Tipo: {filterType === "INCIDENT" ? "Incidente" : "Requisição"}</span>
                <button type="button" onClick={() => setFilterType("ALL")} className="hover:opacity-75">✕</button>
              </span>
            )}

            {/* Chip de Atendente */}
            {filterAssignee !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-elevated text-foreground border border-border text-[11px] font-medium">
                <span>Atendente: {filterAssignee === "MINE" ? "Meus Chamados" : "Fila"}</span>
                <button type="button" onClick={() => setFilterAssignee("ALL")} className="hover:opacity-75">✕</button>
              </span>
            )}

            {/* Chip de Categoria */}
            {filterCategory !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-elevated text-foreground border border-border text-[11px] font-medium">
                <span>Categoria: {categories.find(c => c.id === filterCategory)?.name || "Selecionada"}</span>
                <button type="button" onClick={() => setFilterCategory("ALL")} className="hover:opacity-75">✕</button>
              </span>
            )}

            {/* Chip de Período Não Padrão */}
            {(filterYear !== currentYearStr || filterMonth !== currentMonthStr || filterDayRange !== "ALL_MONTH") && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
                <span>Período: {activePeriodLabel}</span>
                <button type="button" onClick={handleResetToCurrentMonth} className="hover:opacity-75" title="Restaurar mês atual">✕</button>
              </span>
            )}

            {/* Botão Limpar Tudo */}
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] font-bold text-muted-foreground hover:text-danger underline ml-auto"
            >
              Limpar Todos
            </button>
          </div>
        )}

      </div>

      {/* VIEW: Table Mode Clean & Compact */}
      {viewMode === "table" && (
        <div className="bg-surface shadow-2xs border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/60 text-left">
              <thead className="bg-surface-elevated/70 border-b border-border/80">
                <tr>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Código</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Assunto & Resumo</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Prioridade</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Solicitante</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Responsável</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Abertura</th>
                  <th className="px-3.5 py-2.5 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <HeadphonesIcon className="w-8 h-8 text-muted-foreground/40 mb-2.5" />
                        <p className="text-sm font-semibold text-foreground">Nenhum chamado encontrado</p>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                          Não foram localizados chamados no período <b>{activePeriodLabel}</b> com os filtros selecionados.
                        </p>
                        <div className="flex items-center gap-2 mt-3.5">
                          <button
                            type="button"
                            onClick={handleClearDateFilters}
                            className="bg-surface-elevated hover:bg-surface-hover text-foreground border border-border px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Ver Todo o Histórico
                          </button>
                          <Link
                            href="/service-desk/new"
                            className="bg-primary text-primary-foreground px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors"
                          >
                            + Abrir Novo Chamado
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const statusInfo = STATUS_CONFIG[ticket.status] || { label: ticket.status, badge: "bg-muted text-muted-foreground border-border" };
                    const priorityInfo = PRIORITY_CONFIG[ticket.priority] || { label: ticket.priority, badge: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
                    
                    return (
                      <tr key={ticket.id} className="hover:bg-surface-hover/60 transition-colors group">
                        {/* Code */}
                        <td className="px-3.5 py-2.5 sm:py-3 whitespace-nowrap">
                          <Link href={`/service-desk/${ticket.id}`} className="font-mono text-xs font-bold text-primary hover:underline">
                            {ticket.code}
                          </Link>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                            {ticket.type === "INCIDENT" ? "Incidente" : "Requisição"}
                          </div>
                        </td>

                        {/* Title & Description */}
                        <td className="px-3.5 py-2.5 sm:py-3">
                          <Link href={`/service-desk/${ticket.id}`} className="font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors block line-clamp-1">
                            {ticket.title}
                          </Link>
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {ticket.description}
                          </div>
                          {ticket.category && (
                            <span className="inline-block mt-1 text-[10px] font-medium text-muted-foreground bg-surface-elevated border border-border/80 px-1.5 py-0.2 rounded">
                              {ticket.category.name}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-2.5 sm:py-3 whitespace-nowrap">
                          <select
                            value={ticket.status}
                            disabled={actionLoadingId === ticket.id}
                            onChange={(e) => handleQuickStatusChange(ticket.id, e.target.value)}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold border cursor-pointer focus:ring-1 focus:ring-primary shadow-2xs transition-all ${statusInfo.badge}`}
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
                        <td className="px-3.5 py-2.5 sm:py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold border ${priorityInfo.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
                            {priorityInfo.label}
                          </span>
                        </td>

                        {/* Requester */}
                        <td className="px-3.5 py-2.5 sm:py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {(ticket.requester_name || ticket.requester?.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-foreground line-clamp-1">
                                {ticket.requester_name || ticket.requester?.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground">{ticket.requester?.email || "Solicitante"}</div>
                            </div>
                          </div>
                        </td>

                        {/* Assignee */}
                        <td className="px-3.5 py-2.5 sm:py-3 whitespace-nowrap">
                          {ticket.assigned_to_name || ticket.assigned_to ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <div className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center text-[10px] font-bold">
                                {(ticket.assigned_to_name || ticket.assigned_to?.name || "T").charAt(0).toUpperCase()}
                              </div>
                              <span className="line-clamp-1">{ticket.assigned_to_name || ticket.assigned_to?.name}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoadingId === ticket.id}
                              onClick={() => handleAssignToMe(ticket.id)}
                              className="text-[10px] font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2 py-0.5 rounded-md transition-colors"
                            >
                              {actionLoadingId === ticket.id ? "Atribuindo..." : "+ Assumir"}
                            </button>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-3.5 py-2.5 sm:py-3 whitespace-nowrap text-xs text-muted-foreground">
                          <div>{new Date(ticket.created_at).toLocaleDateString("pt-BR")}</div>
                          <div className="text-[10px] text-muted-foreground">{formatTimeAgo(ticket.created_at)}</div>
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-2.5 sm:py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/service-desk/${ticket.id}`}
                              className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
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

      {/* VIEW: Reports & Indicators Mode */}
      {viewMode === "reports" && (
        <div className="space-y-6">
          {/* Top Reports Control & Export Actions Bar */}
          <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Relatórios & Indicadores Gerenciais de TI
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Acompanhe o desempenho do atendimento, SLAs e gere relatórios executivos em PDF e Excel.
              </p>
              
              {/* Period Quick Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Período:
                </span>
                {[
                  { id: "TODAY", label: "Hoje" },
                  { id: "LAST_7_DAYS", label: "Últimos 7 dias" },
                  { id: "THIS_MONTH", label: "Este Mês" },
                  { id: "LAST_30_DAYS", label: "Últimos 30 dias" },
                  { id: "ALL", label: "Todo o Histórico" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setReportPeriod(p.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      reportPeriod === p.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-surface-elevated text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Export Actions */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => exportTicketsToPDF(reportFilteredTickets, { 
                  title: "RELATÓRIO GERENCIAL DE SERVICE DESK", 
                  authorName: currentUser?.name || "Administrador",
                  filterSummary: `Período selecionado: ${reportPeriod === "THIS_MONTH" ? "Este Mês" : reportPeriod}`
                })}
                className="inline-flex items-center justify-center gap-2 bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
                title="Baixar relatório formatado em PDF"
              >
                <FileText className="w-4 h-4" />
                <span>Baixar PDF</span>
              </button>

              <button
                type="button"
                onClick={() => exportTicketsToExcel(reportFilteredTickets, { 
                  title: "RELATÓRIO GERENCIAL DE SERVICE DESK", 
                  authorName: currentUser?.name || "Administrador",
                  filterSummary: `Período selecionado: ${reportPeriod === "THIS_MONTH" ? "Este Mês" : reportPeriod}`
                })}
                className="inline-flex items-center justify-center gap-2 bg-success/10 hover:bg-success/20 text-success border border-success/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
                title="Baixar planilha de dados e indicadores em Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Baixar Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
                title="Abrir modal com filtros avançados e opções de cabeçalho"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filtros Avançados...</span>
              </button>
            </div>
          </div>

          {/* KPI Dashboard Cards for Reports */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total do Período
              </span>
              <div className="mt-1 text-2xl font-extrabold text-foreground">{reportStats.total}</div>
              <span className="text-[11px] text-muted-foreground">Chamados computados</span>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-success block">
                Taxa de Resolução
              </span>
              <div className="mt-1 text-2xl font-extrabold text-success">{reportStats.resolutionRate}%</div>
              <span className="text-[11px] text-muted-foreground">{reportStats.resolved} resolvidos / fechados</span>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-warning block">
                Em Aberto / Fila
              </span>
              <div className="mt-1 text-2xl font-extrabold text-warning">{reportStats.open}</div>
              <span className="text-[11px] text-muted-foreground">Requer atendimento</span>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-danger block">
                Críticos / Alta
              </span>
              <div className="mt-1 text-2xl font-extrabold text-danger">{reportStats.critical}</div>
              <span className="text-[11px] text-muted-foreground">Alta prioridade</span>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-info block">
                Incidentes vs Req.
              </span>
              <div className="mt-1 text-xl font-extrabold text-info">
                {reportStats.incidents} <span className="text-xs font-normal text-muted-foreground">/</span> {reportStats.requests}
              </div>
              <span className="text-[11px] text-muted-foreground">{reportStats.incidents} Inc. / {reportStats.requests} Req.</span>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Tempo Médio Resol.
              </span>
              <div className="mt-1 text-2xl font-extrabold text-foreground">
                {reportStats.avgResolutionHours > 0 ? `${reportStats.avgResolutionHours}h` : "< 1h"}
              </div>
              <span className="text-[11px] text-muted-foreground">Média de conclusão</span>
            </div>
          </div>

          {/* Breakdown Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Status Breakdown Panel */}
            <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-primary" />
                  Distribuição por Status
                </h3>
                <span className="text-xs font-bold text-muted-foreground">
                  {reportStats.total} registros
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(STATUS_CONFIG).map(([stKey, cfg]) => {
                  const count = reportStats.statusCounts[stKey] || 0;
                  const pct = reportStats.total > 0 ? Math.round((count / reportStats.total) * 100) : 0;

                  return (
                    <div key={stKey} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cfg.badge.split(" ")[0]}`} />
                          {cfg.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono text-[11px]">{count} chamados</span>
                          <span className="font-bold text-foreground text-xs w-9 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden border border-border/50">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            stKey === "RESOLVED" || stKey === "CLOSED" ? "bg-success" :
                            stKey === "IN_PROGRESS" || stKey === "ASSIGNED" ? "bg-warning" :
                            stKey === "NEW" || stKey === "TRIAGE" ? "bg-info" :
                            stKey === "CANCELED" ? "bg-danger" : "bg-orange-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Breakdown Panel */}
            <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Distribuição por Categoria
                </h3>
                <span className="text-xs font-bold text-muted-foreground">
                  {reportStats.sortedCategories.length} categorias
                </span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {reportStats.sortedCategories.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    Nenhum chamado no período selecionado.
                  </div>
                ) : (
                  reportStats.sortedCategories.map(([catName, count]) => {
                    const pct = reportStats.total > 0 ? Math.round((count / reportStats.total) * 100) : 0;
                    return (
                      <div key={catName} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground truncate max-w-[240px]">
                            {catName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-[11px]">{count} chamados</span>
                            <span className="font-bold text-foreground text-xs w-9 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden border border-border/50">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Team Productivity & Priority Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Priority Distribution */}
            <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-danger" />
                Volume por Prioridade
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {[
                  { key: "CRITICAL", label: "Crítica", count: reportStats.priorityCounts.CRITICAL, badge: "border-danger/30 text-danger bg-danger/10" },
                  { key: "HIGH", label: "Alta", count: reportStats.priorityCounts.HIGH, badge: "border-warning/30 text-warning bg-warning/10" },
                  { key: "MEDIUM", label: "Média", count: reportStats.priorityCounts.MEDIUM, badge: "border-info/30 text-info bg-info/10" },
                  { key: "LOW", label: "Baixa", count: reportStats.priorityCounts.LOW, badge: "border-border text-muted-foreground bg-muted/40" },
                ].map((p) => {
                  const pct = reportStats.total > 0 ? Math.round((p.count / reportStats.total) * 100) : 0;
                  return (
                    <div key={p.key} className={`p-3 rounded-xl border text-center ${p.badge}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">
                        {p.label}
                      </span>
                      <div className="mt-1 text-2xl font-extrabold">{p.count}</div>
                      <span className="text-[10px] font-medium opacity-80">{pct}% do total</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Productivity Ranking */}
            <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-success" />
                Produtividade por Atendente
              </h3>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {reportStats.sortedAttendants.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Nenhum técnico atribuído no período.
                  </div>
                ) : (
                  reportStats.sortedAttendants.map((att) => (
                    <div 
                      key={att.name}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated border border-border text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                          {att.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-foreground">{att.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground">
                          {att.total} atendimentos
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/30">
                          {att.resolved} resolvidos
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Report Data Preview Table */}
          <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden space-y-3 p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Amostra dos Chamados do Relatório ({reportFilteredTickets.length})
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Exibição dos registros contemplados no relatório para conferência rápida.
                </p>
              </div>
              <button
                type="button"
                onClick={() => exportTicketsToPDF(reportFilteredTickets, { 
                  title: "RELATÓRIO GERENCIAL DE SERVICE DESK", 
                  authorName: currentUser?.name || "Administrador"
                })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar lista completa</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated/40 text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Título</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Prioridade</th>
                    <th className="py-2.5 px-3">Solicitante</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3">Abertura</th>
                    <th className="py-2.5 px-3">Encerramento</th>
                    <th className="py-2.5 px-3">Tempo Atend.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {reportFilteredTickets.slice(0, 20).map((t) => {
                    const st = STATUS_CONFIG[t.status] || { label: t.status, badge: "bg-muted text-muted-foreground border-border" };
                    const pr = PRIORITY_CONFIG[t.priority] || { label: t.priority, badge: "bg-muted text-muted-foreground border-border" };
                    const closing = t.closed_at || t.resolved_at;
                    const isClosed = (t.status === "RESOLVED" || t.status === "CLOSED" || !!closing) && !!closing;
                    const duration = calculateDuration(t.created_at, t.resolved_at, t.closed_at, t.status);

                    return (
                      <tr key={t.id} className="hover:bg-surface-hover/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">
                          <Link href={`/service-desk/${t.id}`} className="hover:underline">
                            {t.code}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground max-w-xs truncate">
                          {t.title}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.badge}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${pr.badge}`}>
                            {pr.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[140px]">
                          {t.requester_name || t.requester?.name || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-foreground truncate max-w-[140px]">
                          {t.assigned_to_name || t.assigned_to?.name || "Não atribuído"}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px] whitespace-nowrap">
                          {formatDateOnly(t.created_at)} <span className="opacity-70 font-mono text-[10px]">{formatTimeOnly(t.created_at)}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] whitespace-nowrap">
                          {isClosed ? (
                            <span className="text-emerald-500 font-medium">
                              {formatDateOnly(closing)} <span className="opacity-70 font-mono text-[10px]">{formatTimeOnly(closing)}</span>
                            </span>
                          ) : (
                            <span className="text-amber-500/90 font-medium text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              Não encerrado
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] font-bold whitespace-nowrap">
                          {duration === "Em andamento" ? (
                            <span className="text-amber-500">{duration}</span>
                          ) : (
                            <span className="text-emerald-500">{duration}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportação & Relatórios com Filtros */}
      <ServiceDeskExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentScreenTickets={filteredTickets}
        categories={categories}
        departments={departments}
        attendants={attendants}
        currentUserName={currentUser?.name || "Administrador"}
      />

    </div>
  );
}
