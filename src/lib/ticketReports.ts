import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface TicketReportItem {
  id: string;
  code: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  urgency?: string;
  impact?: string;
  created_at: string | Date;
  resolved_at?: string | Date | null;
  closed_at?: string | Date | null;
  requester?: {
    name?: string | null;
    email?: string | null;
  } | null;
  assigned_to?: {
    name?: string | null;
    email?: string | null;
  } | null;
  assigned_to_name?: string | null;
  category?: {
    name?: string | null;
  } | null;
  department?: {
    name?: string | null;
  } | null;
  asset?: {
    name?: string | null;
    internal_id?: string | null;
    asset_tag?: string | null;
  } | null;
}

export const STATUS_LABELS: Record<string, string> = {
  NEW: "Novo",
  TRIAGE: "Em Triagem",
  ASSIGNED: "Atribuído / Fila",
  IN_PROGRESS: "Em Atendimento",
  WAITING_USER: "Aguardando Usuário",
  WAITING_VENDOR: "Aguardando Fornecedor",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
  CANCELED: "Cancelado",
};

export const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export interface ReportOptions {
  title?: string;
  subtitle?: string;
  filterSummary?: string;
  authorName?: string;
  dateRange?: string;
}

function formatDate(dateVal?: string | Date | null): string {
  if (!dateVal) return "-";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

/**
 * Exporta chamados para planilha Microsoft Excel (.xlsx) com múltiplas abas e formatação profissional
 */
export function exportTicketsToExcel(tickets: TicketReportItem[], options: ReportOptions = {}) {
  const wb = XLSX.utils.book_new();

  // 1. Dados detalhados de cada chamado
  const rows = tickets.map((t) => ({
    "Código": t.code || t.id,
    "Título": t.title,
    "Tipo": t.type === "INCIDENT" ? "Incidente" : "Requisição",
    "Status": STATUS_LABELS[t.status] || t.status,
    "Prioridade": PRIORITY_LABELS[t.priority] || t.priority,
    "Solicitante": t.requester?.name || "Não informado",
    "E-mail Solicitante": t.requester?.email || "-",
    "Técnico Responsável": t.assigned_to_name || t.assigned_to?.name || "Não atribuído",
    "Categoria": t.category?.name || "Geral",
    "Departamento": t.department?.name || "-",
    "Equipamento / Ativo": t.asset ? `${t.asset.internal_id || t.asset.asset_tag || ''} ${t.asset.name}`.trim() : "-",
    "Data de Abertura": formatDate(t.created_at),
    "Data de Resolução": formatDate(t.resolved_at),
    "Descrição": t.description || "",
  }));

  const wsTickets = XLSX.utils.json_to_sheet(rows);

  // Larguras ideais das colunas no Excel
  wsTickets["!cols"] = [
    { wch: 14 }, // Código
    { wch: 38 }, // Título
    { wch: 14 }, // Tipo
    { wch: 18 }, // Status
    { wch: 12 }, // Prioridade
    { wch: 25 }, // Solicitante
    { wch: 28 }, // E-mail
    { wch: 25 }, // Responsável
    { wch: 20 }, // Categoria
    { wch: 20 }, // Departamento
    { wch: 25 }, // Ativo
    { wch: 18 }, // Data Abertura
    { wch: 18 }, // Data Resolução
    { wch: 45 }, // Descrição
  ];

  XLSX.utils.book_append_sheet(wb, wsTickets, "Chamados");

  // 2. Aba de Resumo Executivo e Indicadores
  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  tickets.forEach((t) => {
    const s = STATUS_LABELS[t.status] || t.status;
    statusCounts[s] = (statusCounts[s] || 0) + 1;

    const p = PRIORITY_LABELS[t.priority] || t.priority;
    priorityCounts[p] = (priorityCounts[p] || 0) + 1;

    const c = t.category?.name || "Geral";
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  });

  const summaryRows: any[] = [
    { "Indicador": "Sistema", "Valor": "SYNGETI - Gestão Integrada de TI" },
    { "Indicador": "Relatório", "Valor": options.title || "Relatório de Chamados (Service Desk)" },
    { "Indicador": "Data de Extração", "Valor": new Date().toLocaleString("pt-BR") },
    { "Indicador": "Gerado por", "Valor": options.authorName || "Administrador" },
    { "Indicador": "Filtros Aplicados", "Valor": options.filterSummary || "Todos os chamados" },
    { "Indicador": "Total de Chamados", "Valor": tickets.length },
    { "Indicador": "", "Valor": "" },
    { "Indicador": "--- DISTRIBUIÇÃO POR STATUS ---", "Valor": "" },
    ...Object.entries(statusCounts).map(([status, count]) => ({ "Indicador": status, "Valor": count })),
    { "Indicador": "", "Valor": "" },
    { "Indicador": "--- DISTRIBUIÇÃO POR PRIORIDADE ---", "Valor": "" },
    ...Object.entries(priorityCounts).map(([priority, count]) => ({ "Indicador": priority, "Valor": count })),
    { "Indicador": "", "Valor": "" },
    { "Indicador": "--- DISTRIBUIÇÃO POR CATEGORIA ---", "Valor": "" },
    ...Object.entries(categoryCounts).map(([category, count]) => ({ "Indicador": category, "Valor": count })),
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 35 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo Executivo");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `relatorio_chamados_${today}.xlsx`);
}

/**
 * Exporta chamados para relatório executivo em PDF (.pdf) profissional com cabeçalho, KPIs, tabela estilizada e paginação
 */
export function exportTicketsToPDF(tickets: TicketReportItem[], options: ReportOptions = {}) {
  // Orientação paisagem A4 para maximizar legibilidade das colunas
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Top Banner / Header Decorativo
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 24, "F");

  // Barra de destaque azul primário SYNGETI
  doc.setFillColor(2, 132, 199); // Sky 600
  doc.rect(0, 24, pageWidth, 2, "F");

  // Logotipo / Título da Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("SYNGETI", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(56, 189, 248); // Sky 400
  doc.text("GESTÃO INTEGRADA DE TI • SERVICE DESK", 14, 16);

  // Título do Relatório no Banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(options.title || "RELATÓRIO GERENCIAL DE CHAMADOS", pageWidth / 2, 11, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(options.subtitle || "Acompanhamento de Incidentes, Requisições e SLAs", pageWidth / 2, 16, { align: "center" });

  // Metadados no topo direito
  doc.setFontSize(7.5);
  doc.setTextColor(241, 245, 249);
  const nowStr = new Date().toLocaleString("pt-BR");
  doc.text(`Emissão: ${nowStr}`, pageWidth - 14, 9, { align: "right" });
  doc.text(`Operador: ${options.authorName || "Administrador"}`, pageWidth - 14, 13.5, { align: "right" });
  doc.text(`Total: ${tickets.length} chamados`, pageWidth - 14, 18, { align: "right" });

  // 2. Cartões de Resumo / KPIs (Cards no topo)
  const totalTickets = tickets.length;
  const newOrTriage = tickets.filter(t => t.status === "NEW" || t.status === "TRIAGE").length;
  const inProgress = tickets.filter(t => t.status === "IN_PROGRESS" || t.status === "ASSIGNED" || t.status === "WAITING_USER").length;
  const resolvedClosed = tickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length;
  const criticalHigh = tickets.filter(t => t.priority === "CRITICAL" || t.priority === "HIGH").length;

  const cardY = 30;
  const cardHeight = 15;
  const cardWidth = (pageWidth - 28 - (4 * 4)) / 5;

  const kpis = [
    { label: "TOTAL DE CHAMADOS", value: totalTickets, color: [15, 23, 42] },
    { label: "NOVOS / TRIAGEM", value: newOrTriage, color: [2, 132, 199] },
    { label: "EM ANDAMENTO", value: inProgress, color: [217, 119, 6] },
    { label: "RESOLVIDOS / FECHADOS", value: resolvedClosed, color: [16, 185, 129] },
    { label: "CRÍTICOS / ALTA", value: criticalHigh, color: [225, 29, 72] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 4);
    // Fundo do card
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, "F");

    // Borda superior colorida
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(x, cardY, cardWidth, 1.8, 0.8, 0.8, "F");

    // Rótulo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(kpi.label, x + cardWidth / 2, cardY + 6.5, { align: "center" });

    // Valor
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(String(kpi.value), x + cardWidth / 2, cardY + 12.5, { align: "center" });
  });

  // Linha de contexto do filtro se houver
  let tableStartY = 50;
  if (options.filterSummary) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Filtros ativos: ${options.filterSummary}`, 14, 48.5);
    tableStartY = 51.5;
  }

  // 3. Tabela de Chamados com jspdf-autotable
  const tableHeaders = [
    "CÓDIGO",
    "ABERTURA",
    "TÍTULO DO CHAMADO",
    "SOLICITANTE",
    "CATEGORIA",
    "PRIORIDADE",
    "RESPONSÁVEL",
    "STATUS",
  ];

  const tableBody = tickets.map((t) => [
    t.code || t.id.substring(0, 10).toUpperCase(),
    formatDate(t.created_at).replace(" ", "\n"),
    t.title,
    t.requester?.name || "Não informado",
    t.category?.name || "Geral",
    PRIORITY_LABELS[t.priority] || t.priority,
    t.assigned_to_name || t.assigned_to?.name || "Não atribuído",
    STATUS_LABELS[t.status] || t.status,
  ]);

  (autoTable as any)(doc, {
    head: [tableHeaders],
    body: tableBody,
    startY: tableStartY,
    margin: { left: 14, right: 14, bottom: 16 },
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 2.2,
      overflow: "linebreak",
      textColor: [30, 41, 59], // Slate 800
      lineColor: [226, 232, 240], // Slate 200
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [2, 132, 199], // Sky 600
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "left",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: "bold", halign: "center" }, // Código
      1: { cellWidth: 25, halign: "center", fontSize: 6.8 }, // Data
      2: { cellWidth: "auto" }, // Título
      3: { cellWidth: 38 }, // Solicitante
      4: { cellWidth: 28 }, // Categoria
      5: { cellWidth: 20, fontStyle: "bold", halign: "center" }, // Prioridade
      6: { cellWidth: 35 }, // Responsável
      7: { cellWidth: 26, fontStyle: "bold", halign: "center" }, // Status
    },
    didParseCell: function (data: any) {
      // Cores para a coluna de Prioridade
      if (data.section === "body" && data.column.index === 5) {
        const val = data.cell.raw;
        if (val === "Crítica") {
          data.cell.styles.textColor = [225, 29, 72]; // Rose 600
        } else if (val === "Alta") {
          data.cell.styles.textColor = [217, 119, 6]; // Amber 600
        } else if (val === "Média") {
          data.cell.styles.textColor = [2, 132, 199]; // Sky 600
        }
      }
      // Cores para a coluna de Status
      if (data.section === "body" && data.column.index === 7) {
        const val = data.cell.raw;
        if (val === "Resolvido" || val === "Fechado") {
          data.cell.styles.textColor = [16, 185, 129]; // Emerald 600
        } else if (val === "Em Atendimento") {
          data.cell.styles.textColor = [217, 119, 6]; // Amber 600
        } else if (val === "Novo" || val === "Em Triagem") {
          data.cell.styles.textColor = [2, 132, 199]; // Sky 600
        }
      }
    },
    didDrawPage: function (data: any) {
      // 4. Rodapé Profissional com Paginação
      const str = `Página ${data.pageNumber} de ${data.pageCount || doc.getNumberOfPages()}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // Slate 400

      // Linha divisória fina
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

      doc.text("SYNGETI • Sistema Integrado de Gestão de TI — Relatório Oficial Confidencial", 14, pageHeight - 6);
      doc.text(str, pageWidth - 14, pageHeight - 6, { align: "right" });
    },
  });

  const today = new Date().toISOString().split("T")[0];
  doc.save(`relatorio_chamados_${today}.pdf`);
}

/**
 * Exporta para CSV com BOM UTF-8 e formatação compatível com Excel em Português
 */
export function exportTicketsToCSV(tickets: TicketReportItem[]) {
  if (tickets.length === 0) return;

  const headers = [
    "Código",
    "Título",
    "Tipo",
    "Status",
    "Prioridade",
    "Solicitante",
    "E-mail Solicitante",
    "Técnico Atribuído",
    "Categoria",
    "Departamento",
    "Equipamento / Ativo",
    "Data de Abertura",
    "Data de Resolução",
    "Descrição"
  ];

  const rows = tickets.map((t) => [
    t.code || t.id,
    `"${(t.title || "").replace(/"/g, '""')}"`,
    t.type === "INCIDENT" ? "Incidente" : "Requisição",
    STATUS_LABELS[t.status] || t.status,
    PRIORITY_LABELS[t.priority] || t.priority,
    `"${(t.requester?.name || "").replace(/"/g, '""')}"`,
    `"${(t.requester?.email || "").replace(/"/g, '""')}"`,
    `"${((t.assigned_to_name || t.assigned_to?.name) || "Não atribuído").replace(/"/g, '""')}"`,
    `"${(t.category?.name || "Geral").replace(/"/g, '""')}"`,
    `"${(t.department?.name || "-").replace(/"/g, '""')}"`,
    `"${(t.asset ? `${t.asset.internal_id || t.asset.asset_tag || ''} ${t.asset.name}` : "-").replace(/"/g, '""')}"`,
    formatDate(t.created_at),
    formatDate(t.resolved_at),
    `"${(t.description || "").replace(/"/g, '""')}"`,
  ]);

  // UTF-8 BOM (\uFEFF) para abrir com acentuação correta no Excel brasileiro
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `chamados_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
