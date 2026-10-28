"use client";

import { useState, useMemo } from "react";
import { 
  X, FileText, Table as TableIcon, FileSpreadsheet, Download, 
  Calendar, Filter, RefreshCw, CheckCircle2, Layers, Check,
  AlertCircle
} from "lucide-react";
import { 
  exportTicketsToPDF, 
  exportTicketsToExcel, 
  exportTicketsToCSV, 
  TicketReportItem,
  STATUS_LABELS,
  PRIORITY_LABELS
} from "@/lib/ticketReports";

interface Category {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface ServiceDeskExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreenTickets: any[];
  categories: Category[];
  departments?: Department[];
  attendants?: UserOption[];
  currentUserName?: string;
}

type ExportFormat = "PDF" | "XLSX" | "CSV";
type ExportScope = "SCREEN" | "DATABASE";
type DatePreset = "THIS_WEEK" | "LAST_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "LAST_YEAR" | "CUSTOM" | "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";

export default function ServiceDeskExportModal({
  isOpen,
  onClose,
  currentScreenTickets,
  categories,
  departments = [],
  attendants = [],
  currentUserName = "Administrador",
}: ServiceDeskExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("PDF");
  const [scope, setScope] = useState<ExportScope>("SCREEN");
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Primeiro dia do mês atual
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Filtros adicionais para busca no banco
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterAttendant, setFilterAttendant] = useState("ALL");

  // Customização do cabeçalho do relatório
  const [customTitle, setCustomTitle] = useState("RELATÓRIO GERENCIAL DE CHAMADOS");
  const [customSubtitle, setCustomSubtitle] = useState("Service Desk • Indicadores e Acompanhamento de Chamados");
  
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Aplicação rápida de presets de data
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (preset === "TODAY") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "THIS_WEEK") {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(new Date().setDate(diff));
      setStartDate(monday.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "LAST_WEEK") {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const prevMonday = new Date(new Date().setDate(diff));
      const prevSunday = new Date(new Date().setDate(diff + 6));
      setStartDate(prevMonday.toISOString().split("T")[0]);
      setEndDate(prevSunday.toISOString().split("T")[0]);
    } else if (preset === "THIS_MONTH") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "LAST_MONTH") {
      const startLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(startLastMonth.toISOString().split("T")[0]);
      setEndDate(endLastMonth.toISOString().split("T")[0]);
    } else if (preset === "THIS_YEAR") {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      setStartDate(startOfYear.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "LAST_YEAR") {
      const startLastYear = new Date(today.getFullYear() - 1, 0, 1);
      const endLastYear = new Date(today.getFullYear() - 1, 11, 31);
      setStartDate(startLastYear.toISOString().split("T")[0]);
      setEndDate(endLastYear.toISOString().split("T")[0]);
    } else if (preset === "LAST_7_DAYS") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "LAST_30_DAYS") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Executa o processo de exportação
  const handleExecuteExport = async () => {
    setFeedbackMsg(null);
    setIsExporting(true);

    try {
      let ticketsToExport: TicketReportItem[] = [];
      let filterSummary = "";

      if (scope === "SCREEN") {
        ticketsToExport = currentScreenTickets;
        filterSummary = `Chamados filtrados na tela atual (${ticketsToExport.length} registros)`;
      } else {
        // Busca completa na API de tickets com os filtros selecionados
        const params = new URLSearchParams();
        params.set("isExport", "true");
        params.set("limit", "5000");

        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        if (filterStatus !== "ALL") params.set("status", filterStatus);
        if (filterPriority !== "ALL") params.set("priority", filterPriority);
        if (filterType !== "ALL") params.set("type", filterType);
        if (filterCategory !== "ALL") params.set("category_id", filterCategory);
        if (filterDepartment !== "ALL") params.set("department_id", filterDepartment);
        if (filterAttendant !== "ALL") params.set("assigned_to_id", filterAttendant);

        const res = await fetch(`/api/tickets?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Erro ao consultar dados no servidor.");
        }
        const data = await res.json();
        ticketsToExport = Array.isArray(data) ? data : data.tickets || [];

        const parts: string[] = [];
        if (startDate || endDate) parts.push(`Período: ${startDate || "Início"} até ${endDate || "Hoje"}`);
        if (filterStatus !== "ALL") parts.push(`Status: ${STATUS_LABELS[filterStatus] || filterStatus}`);
        if (filterPriority !== "ALL") parts.push(`Prioridade: ${PRIORITY_LABELS[filterPriority] || filterPriority}`);
        if (filterType !== "ALL") parts.push(`Tipo: ${filterType === "INCIDENT" ? "Incidente" : "Requisição"}`);
        filterSummary = parts.length > 0 ? parts.join(" • ") : "Todos os chamados do banco de dados";
      }

      if (!ticketsToExport || ticketsToExport.length === 0) {
        setFeedbackMsg({
          type: "error",
          text: "Nenhum chamado encontrado para os critérios selecionados.",
        });
        setIsExporting(false);
        return;
      }

      const reportOptions = {
        title: customTitle.trim() || "RELATÓRIO GERENCIAL DE CHAMADOS",
        subtitle: customSubtitle.trim() || undefined,
        filterSummary,
        authorName: currentUserName,
        dateRange: startDate && endDate ? `${startDate} a ${endDate}` : undefined,
      };

      if (format === "PDF") {
        await exportTicketsToPDF(ticketsToExport, reportOptions);
      } else if (format === "XLSX") {
        await exportTicketsToExcel(ticketsToExport, reportOptions);
      } else {
        exportTicketsToCSV(ticketsToExport);
      }

      setFeedbackMsg({
        type: "success",
        text: `Arquivo ${format} com ${ticketsToExport.length} chamados gerado com sucesso!`,
      });

      // Fechar o modal após pequeno delay para o usuário ver o feedback de sucesso
      setTimeout(() => {
        onClose();
      }, 1400);

    } catch (err: any) {
      console.error("Erro na exportação:", err);
      setFeedbackMsg({
        type: "error",
        text: err.message || "Ocorreu um erro ao gerar o arquivo.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Exportação & Relatórios de Chamados
              </h2>
              <p className="text-xs text-muted-foreground">
                Gere documentos executivos em PDF ou planilhas XLSX/CSV com filtros flexíveis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Formato do Arquivo */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              1. Selecione o Formato de Saída
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat("PDF")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  format === "PDF"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                    : "border-border bg-surface-elevated hover:bg-surface-hover text-muted-foreground"
                }`}
              >
                <FileText className="w-6 h-6 mb-1.5 text-danger" />
                <span className="font-bold text-xs text-foreground">Relatório em PDF</span>
                <span className="text-[10px] text-muted-foreground">Executivo com KPIs e tabelas</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("XLSX")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  format === "XLSX"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                    : "border-border bg-surface-elevated hover:bg-surface-hover text-muted-foreground"
                }`}
              >
                <FileSpreadsheet className="w-6 h-6 mb-1.5 text-success" />
                <span className="font-bold text-xs text-foreground">Planilha Excel (.xlsx)</span>
                <span className="text-[10px] text-muted-foreground">Abas de dados e indicadores</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("CSV")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  format === "CSV"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                    : "border-border bg-surface-elevated hover:bg-surface-hover text-muted-foreground"
                }`}
              >
                <TableIcon className="w-6 h-6 mb-1.5 text-info" />
                <span className="font-bold text-xs text-foreground">Arquivo CSV</span>
                <span className="text-[10px] text-muted-foreground">Compatível com Excel pt-BR</span>
              </button>
            </div>
          </div>

          {/* Origem / Escopo dos Dados */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              2. Escopo dos Dados
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  scope === "SCREEN"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-surface-elevated hover:bg-surface-hover text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === "SCREEN"}
                  onChange={() => setScope("SCREEN")}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-bold text-xs text-foreground block">
                    Chamados Filtrados na Tela Atual
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Exporta exatamente os <b>{currentScreenTickets.length}</b> chamados visíveis com seus filtros de busca ativos.
                  </span>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  scope === "DATABASE"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-surface-elevated hover:bg-surface-hover text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === "DATABASE"}
                  onChange={() => setScope("DATABASE")}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-bold text-xs text-foreground block">
                    Pesquisa Completa no Banco de Dados
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Consulta diretamente o banco por período histórico e critérios avançados (até 5.000 chamados).
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Filtros Avançados (ativos quando escopo for DATABASE) */}
          {scope === "DATABASE" && (
            <div className="p-4 rounded-xl border border-border bg-surface-elevated/40 space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                <Filter className="w-3.5 h-3.5 text-primary" />
                <span>Filtros do Relatório no Banco de Dados</span>
              </div>

              {/* Presets de Data */}
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1.5">Período Pré-definido:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "THIS_WEEK", label: "Semana Atual" },
                    { id: "LAST_WEEK", label: "Semana Anterior" },
                    { id: "THIS_MONTH", label: "Mês Atual" },
                    { id: "LAST_MONTH", label: "Mês Anterior" },
                    { id: "THIS_YEAR", label: "Ano Atual" },
                    { id: "LAST_YEAR", label: "Ano Anterior" },
                    { id: "CUSTOM", label: "Personalizado" },
                    { id: "ALL", label: "Todo o Histórico" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleDatePresetChange(p.id as DatePreset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        datePreset === p.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Início e Fim */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Data Inicial:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset("CUSTOM");
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Data Final:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset("CUSTOM");
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Linha com Status, Prioridade e Tipo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs"
                  >
                    <option value="ALL">Todos os status</option>
                    <option value="NEW">Novos</option>
                    <option value="TRIAGE">Em Triagem</option>
                    <option value="ASSIGNED">Atribuídos</option>
                    <option value="IN_PROGRESS">Em Atendimento</option>
                    <option value="WAITING_USER">Aguardando Usuário</option>
                    <option value="RESOLVED">Resolvidos</option>
                    <option value="CLOSED">Fechados</option>
                    <option value="CANCELED">Cancelados</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Prioridade
                  </label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs"
                  >
                    <option value="ALL">Todas as prioridades</option>
                    <option value="CRITICAL">Crítica</option>
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Média</option>
                    <option value="LOW">Baixa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Tipo
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs"
                  >
                    <option value="ALL">Todos os tipos</option>
                    <option value="INCIDENT">Incidente</option>
                    <option value="REQUEST">Requisição</option>
                  </select>
                </div>
              </div>

              {/* Linha com Categoria, Departamento e Atendente */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Categoria
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs"
                  >
                    <option value="ALL">Todas as categorias</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Departamento
                  </label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs"
                  >
                    <option value="ALL">Todos os departamentos</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Técnico / Atendente
                  </label>
                  <select
                    value={filterAttendant}
                    onChange={(e) => setFilterAttendant(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs"
                  >
                    <option value="ALL">Todos os atendentes</option>
                    <option value="UNASSIGNED">Não atribuído</option>
                    {attendants.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Customização de Título do Relatório (opcional) */}
          {format === "PDF" && (
            <div className="border-t border-border pt-3 space-y-2">
              <label className="block text-[10px] uppercase font-bold text-muted-foreground">
                Cabeçalho do Relatório PDF (Opcional)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Título do Relatório"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs"
                />
                <input
                  type="text"
                  placeholder="Subtítulo ou departamento"
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs"
                />
              </div>
            </div>
          )}

          {/* Mensagem de Feedback */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                feedbackMsg.type === "success"
                  ? "bg-success/10 border-success/30 text-success"
                  : "bg-danger/10 border-danger/30 text-danger"
              }`}
            >
              {feedbackMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface-elevated/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gerando arquivo...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {format === "PDF" && "Baixar Relatório em PDF"}
                  {format === "XLSX" && "Baixar Planilha Excel (.xlsx)"}
                  {format === "CSV" && "Exportar Arquivo CSV"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
