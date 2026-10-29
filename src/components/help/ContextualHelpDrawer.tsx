"use client";

import { useState } from "react";
import { 
  X, Download, ExternalLink, HelpCircle, BookOpen, 
  ZoomIn, ZoomOut, RotateCcw, AlertTriangle, FileText, ChevronRight 
} from "lucide-react";
import Link from "next/link";
import { useContextualHelp } from "./ContextualHelpContext";

export function ContextualHelpDrawer() {
  const { isOpen, closeHelp, manual, relatedManuals, isLoading, hasLoaded, selectManual } = useContextualHelp();
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Backdrop clicável para fechar sem perder dados do formulário */}
      <div className="flex-1 cursor-pointer" onClick={closeHelp} />

      {/* Painel Lateral Deslizante */}
      <aside className="w-full max-w-2xl bg-surface border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* CABEÇALHO */}
        <div className="p-4 sm:p-5 border-b border-border bg-surface-elevated/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                  {manual?.module ? manual.module.toUpperCase() : "SYNGETI WIKI"}
                </span>
                {manual?.version && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    v{manual.version}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate mt-0.5">
                {manual ? manual.title : "Ajuda Contextual"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {manual?.pdfUrl && (
              <a
                href={manual.pdfUrl}
                download={manual.fileName || "manual.pdf"}
                className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                title="Baixar Manual em PDF"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={closeHelp}
              className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
              title="Fechar Ajuda (Retornar à tela)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BARRA DE AÇÕES E ZOOM (QUANDO PDF ESTIVER ATIVO) */}
        {manual && (
          <div className="px-4 py-2 border-b border-border bg-surface flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Visualizador PDF Oficial</span>
              <span className="text-[10px]">• Leve & Pesquisável</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                className="p-1 rounded hover:bg-surface-elevated text-muted-foreground hover:text-foreground"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono w-10 text-center">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
                className="p-1 rounded hover:bg-surface-elevated text-muted-foreground hover:text-foreground"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="p-1 rounded hover:bg-surface-elevated text-muted-foreground hover:text-foreground ml-1"
                title="Restaurar Zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ÁREA DE CONTEÚDO (VISUALIZADOR PDF EMBEDDED OU MENSAGEM AMIGÁVEL) */}
        <div className="flex-1 overflow-y-auto bg-background p-3 sm:p-4 flex flex-col min-h-0">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-semibold text-foreground">Localizando manual oficial da tela...</p>
              <p className="text-[11px] text-muted-foreground">Sincronizando com a Base de Conhecimento Wiki TI</p>
            </div>
          ) : manual ? (
            <div className="flex-1 flex flex-col h-full space-y-3">
              {/* Descrição Curta */}
              {manual.description && (
                <div className="p-3 bg-surface border border-border rounded-xl text-xs text-muted-foreground">
                  {manual.description}
                </div>
              )}

              {/* Visualizador de PDF via Iframe Seguro (Sem recarregar a página pai) */}
              <div className="flex-1 border border-border rounded-xl overflow-hidden bg-white shadow-inner min-h-[420px]">
                <iframe
                  src={`${manual.pdfUrl}#zoom=${zoomLevel}`}
                  className="w-full h-full border-0"
                  title={manual.title}
                />
              </div>

              {/* Manuais Relacionados deste Módulo */}
              {relatedManuals.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    Outros Manuais deste Módulo
                  </span>
                  <div className="space-y-1.5">
                    {relatedManuals.map((rel) => (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => selectManual({ ...rel, pdfUrl: rel.pdfUrl, module: manual.module })}
                        className="w-full p-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-border text-left flex items-center justify-between text-xs transition-colors group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {rel.title}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : hasLoaded ? (
            /* SEÇÃO 7: TRATAMENTO AMIGÁVEL QUANDO O MANUAL NÃO ESTIVER DISPONÍVEL */
            <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-md">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Manual ainda não disponível</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  O manual desta funcionalidade ainda não foi publicado. Você pode consultar a Base de Conhecimento para encontrar orientações relacionadas.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Link
                  href="/knowledge"
                  onClick={closeHelp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Abrir Wiki TI</span>
                </Link>
                <button
                  type="button"
                  onClick={closeHelp}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-foreground transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : null}

        </div>

        {/* RODAPÉ DO PAINEL */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-surface-elevated/40 flex items-center justify-between text-xs">
          <Link
            href="/knowledge"
            onClick={closeHelp}
            className="text-primary hover:underline font-bold flex items-center gap-1.5"
          >
            <span>Ver toda a Base de Conhecimento (Wiki TI)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <span className="text-[11px] text-muted-foreground">
            SYNGETI • Ajuda Inteligente
          </span>
        </div>

      </aside>
    </div>
  );
}
