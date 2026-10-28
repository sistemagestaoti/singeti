"use client";

import { useState, useEffect } from "react";
import { X, FileText, Download, Printer, Filter, Table, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportsModal({ isOpen, onClose }: ReportsModalProps) {
  const [reportType, setReportType] = useState("COMPUTERS");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (type = reportType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pc-access/reports?type=${type}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao carregar relatório");
      setData(json.data || []);
    } catch (err: any) {
      setError(err.message || "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport(reportType);
    }
  }, [isOpen, reportType]);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    if (!data.length) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Relatorio_${reportType}`);
    XLSX.writeFile(
      workbook,
      `syngeti_relatorio_${reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleExportCSV = () => {
    if (!data.length) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(["\uFEFF" + csvOutput], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `syngeti_relatorio_${reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-full print:max-h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Relatórios de Gestão e Acessos</h3>
              <p className="text-xs text-muted-foreground">
                Visualização, auditoria e exportação corporativa sem exposição de segredos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Toolbar */}
        <div className="px-6 py-3.5 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Tipo de Relatório:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="COMPUTERS">Computadores & Inventário de PCs</option>
              <option value="COLLABORATORS">Colaboradores & Vínculos de Uso</option>
              <option value="ACCOUNTS">Contas de Acesso (Windows / Domínio)</option>
              <option value="AUDIT">Histórico de Auditoria & Acessos</option>
            </select>

            <button
              onClick={() => fetchReport(reportType)}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={loading || !data.length}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" /> Excel (.xlsx)
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading || !data.length}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" /> CSV
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || !data.length}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
            </button>
          </div>
        </div>

        {/* Print Header visível somente na impressão */}
        <div className="hidden print:block p-6 border-b border-gray-300">
          <h1 className="text-xl font-bold text-gray-900">SYNGETI — Relatório de Gestão de Acessos a PCs</h1>
          <p className="text-xs text-gray-600 mt-1">
            Tipo: {reportType} | Gerado em: {new Date().toLocaleString("pt-BR")} | Total de registros: {data.length}
          </p>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar print:p-0">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
              Carregando dados do relatório...
            </div>
          ) : data.length === 0 ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              Nenhum registro encontrado para este relatório.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto shadow-sm print:border-none">
              <table className="min-w-full divide-y divide-border text-left text-xs">
                <thead className="bg-surface-hover text-muted-foreground font-bold uppercase tracking-wider print:bg-gray-100 print:text-gray-900">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-3 whitespace-nowrap">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border text-foreground font-normal print:bg-white print:divide-gray-200">
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px]">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-surface-hover/30 flex items-center justify-between text-xs text-muted-foreground print:hidden">
          <span>
            Total de registros: <strong>{data.length}</strong>
          </span>
          <span className="text-[11px] text-amber-500 font-medium">
            Segurança: Senhas e credenciais foram omitidas deste relatório
          </span>
        </div>
      </div>
    </div>
  );
}
