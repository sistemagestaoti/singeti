"use client";

import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, ArrowRight, Check } from "lucide-react";

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportInventoryModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportInventoryModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const templateData = [
      {
        asset_tag: "PAT-1001",
        hostname: "PC-FIN-01",
        name: "Computador Financeiro 01",
        device_type: "DESKTOP",
        manufacturer: "Dell",
        model: "OptiPlex 7090",
        serial_number: "8H7B9K2",
        status: "IN_USE",
        os_name: "Windows 11 Pro",
        os_version: "23H2",
        processor: "Intel Core i5-12400",
        memory_mb: "16384",
        storage_gb: "512",
        ip_address: "192.168.1.101",
        mac_address: "00:1B:44:11:3A:B7",
        domain_workgroup: "CORP.EMPRESA.LOCAL",
        physical_location: "Sala 204",
        department_name: "Tecnologia da Informação",
        location_name: "Matriz Principal",
        collaborator_name: "Alan Patrick Puhle",
        collaborator_email: "alan.puhle@dlamb.ind.br",
        notes: "Importação inicial de parque",
      },
      {
        asset_tag: "PAT-1002",
        hostname: "NOTE-DIR-01",
        name: "Notebook Diretoria",
        device_type: "NOTEBOOK",
        manufacturer: "Lenovo",
        model: "ThinkPad E14",
        serial_number: "PF29X8L",
        status: "IN_USE",
        os_name: "Windows 11 Pro",
        os_version: "23H2",
        processor: "Intel Core i7-1355U",
        memory_mb: "32768",
        storage_gb: "1024",
        ip_address: "192.168.1.102",
        mac_address: "00:1B:44:22:4C:E8",
        domain_workgroup: "AzureAD",
        physical_location: "Diretoria",
        department_name: "Diretoria Executiva",
        location_name: "Matriz Principal",
        collaborator_name: "Diretor Executivo",
        collaborator_email: "diretoria@dlamb.ind.br",
        notes: "Notebook de diretoria",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario_PCs");
    XLSX.writeFile(workbook, "modelo_importacao_pcs_syngeti.xlsx");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setValidationResult(null);
    setAnalyzing(true);

    try {
      const XLSX = await import("xlsx");
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error("A planilha selecionada está vazia.");
      }

      setRows(jsonData);

      // Executa validação em modo Dry Run no backend
      const res = await fetch("/api/pc-access/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: jsonData, dry_run: true }),
      });

      const validationData = await res.json();
      if (!res.ok) {
        throw new Error(validationData.error || "Falha na validação do arquivo");
      }

      setValidationResult(validationData);
    } catch (err: any) {
      setError(err.message || "Erro ao processar o arquivo.");
      setFile(null);
      setRows([]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/pc-access/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, dry_run: false }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao executar importação");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro na importação");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Importar Inventário de PCs</h3>
              <p className="text-xs text-muted-foreground">
                Carga em lote via planilha Excel (.xlsx) ou CSV com validação automática
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {error}
            </div>
          )}

          {/* Download Template Banner */}
          <div className="p-4 rounded-xl bg-surface-hover border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-primary shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-foreground">Modelo Padrão Syngeti</h4>
                <p className="text-[11px] text-muted-foreground">
                  Baixe a planilha de exemplo com as colunas pré-formatadas para preenchimento rápido.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-2 shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Modelo .xlsx
            </button>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-surface hover:bg-surface-hover/50 text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-inner">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {file ? file.name : "Clique para selecionar ou arraste o arquivo"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou CSV delimitado
            </p>
          </div>

          {/* Analisando */}
          {analyzing && (
            <div className="text-center py-4 text-xs font-semibold text-muted-foreground animate-pulse">
              Validando dados da planilha e checando duplicidades...
            </div>
          )}

          {/* Resultado da Validação */}
          {validationResult && !analyzing && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Relatório de Pré-Validação
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-surface-hover border border-border text-center">
                  <span className="text-[11px] text-muted-foreground block">Total Identificado</span>
                  <strong className="text-lg font-bold text-foreground">
                    {validationResult.total_received}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
                    Prontos para Importar
                  </span>
                  <strong className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {validationResult.valid_count}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 block font-medium">
                    Inconsistências / Duplicados
                  </span>
                  <strong className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {validationResult.error_count}
                  </strong>
                </div>
              </div>

              {/* Erros Encontrados se houver */}
              {validationResult.errors?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Linhas com alertas ou impedimentos (serão ignoradas):</span>
                  </div>
                  <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                    {validationResult.errors.map((err: any, idx: number) => (
                      <li key={idx}>
                        <strong>Linha {err.row_number}:</strong> {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-hover/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={importing || !validationResult || validationResult.valid_count === 0}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? "Importando Registros..." : `Confirmar e Importar (${validationResult?.valid_count || 0})`}
          </button>
        </div>
      </div>
    </div>
  );
}
