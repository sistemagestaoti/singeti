"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  X, Download, ExternalLink, HelpCircle, BookOpen, 
  ZoomIn, ZoomOut, AlertTriangle, FileText, ChevronRight, ChevronLeft,
  Maximize2, Minimize2, Search, Layers, MoveHorizontal, RotateCcw,
  Check, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useContextualHelp } from "./ContextualHelpContext";

export function ContextualHelpModal() {
  const { 
    isOpen, 
    closeHelp, 
    manual, 
    relatedManuals, 
    isLoading, 
    hasLoaded, 
    selectManual 
  } = useContextualHelp();

  // Estados de Visualização e Dimensionamento
  const [scaleMode, setScaleMode] = useState<"page-fit" | "page-width" | "custom">("page-fit");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false); // MINIATURAS RECOLHIDAS POR PADRÃO
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Calcula total de páginas do documento (Padrão: 1 para os manuais canônicos do Syngeti)
  const totalPages = useMemo(() => {
    if (manual?.pageCount && manual.pageCount > 0) {
      return manual.pageCount;
    }
    return 1;
  }, [manual?.pageCount]);

  // Reseta estados para visualização padrão ao abrir ou trocar de manual
  useEffect(() => {
    if (isOpen) {
      setScaleMode("page-fit"); // AJUSTAR À PÁGINA — FIT PAGE (REQUISITO FUNDAMENTAL)
      setZoomLevel(100);
      setCurrentPage(1);
      setShowThumbnails(false); // Miniaturas recolhidas por padrão
      setShowSearch(false);
      setSearchQuery("");
      setSearchInput("");
    }
  }, [isOpen, manual?.id]);

  // Bloqueio de rolagem do fundo da página (SYNGETI) enquanto o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Fechamento pelo teclado (ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSearch) {
          setShowSearch(false);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          closeHelp();
        }
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, showSearch, isFullscreen, closeHelp]);

  // URL Dinâmica do PDF com Parâmetros Oficiais de Abertura (RFC 3778 / ISO 32000)
  // Garante Fit Page, remoção de barras redundantes e recolhimento de miniaturas
  const iframeSrc = useMemo(() => {
    if (!manual?.pdfUrl) return "";

    const params: string[] = [];

    // Paginação
    params.push(`page=${currentPage}`);

    // Modo de Ajuste e Zoom
    if (scaleMode === "page-fit") {
      params.push("zoom=page-fit");
      params.push("view=Fit");
    } else if (scaleMode === "page-width") {
      params.push("zoom=page-width");
      params.push("view=FitH");
    } else {
      params.push(`zoom=${zoomLevel}`);
    }

    // Painel de Miniaturas:
    // navpanes=0 oculta a barra lateral no Chrome/Edge/Firefox
    // pagemode=none instrui o motor a não exibir miniaturas ao abrir
    params.push(`navpanes=${showThumbnails ? 1 : 0}`);
    params.push(`pagemode=${showThumbnails ? "thumbs" : "none"}`);

    // Oculta a barra de ferramentas redundante do navegador (evita botões duplicados)
    params.push("toolbar=0");

    // Pesquisa textual quando informada
    if (searchQuery.trim()) {
      params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
    }

    return `${manual.pdfUrl}#${params.join("&")}`;
  }, [manual?.pdfUrl, currentPage, scaleMode, zoomLevel, showThumbnails, searchQuery]);

  // Ações de Zoom
  const handleZoomIn = () => {
    setScaleMode("custom");
    setZoomLevel((prev) => Math.min(250, prev + 15));
  };

  const handleZoomOut = () => {
    setScaleMode("custom");
    setZoomLevel((prev) => Math.max(50, prev - 15));
  };

  const handleFitPage = () => {
    setScaleMode("page-fit");
    setZoomLevel(100);
  };

  const handleFitWidth = () => {
    setScaleMode("page-width");
    setZoomLevel(100);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const handleApplySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setShowSearch(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        // Fecha ao clicar no backdrop externo sem perder o estado de formulários da página
        if (e.target === e.currentTarget) closeHelp();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-manual-title"
    >
      {/* JANELA MODAL CENTRALIZADA, AMPLA E RESPONSIVA (94vw x 92dvh, Max 1800px) */}
      <div
        ref={modalRef}
        className={`w-full h-full sm:w-[94vw] sm:h-[92dvh] max-w-[1800px] max-h-[96vh] rounded-2xl bg-surface border border-border shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? "!w-screen !h-screen !max-w-none !max-h-none !rounded-none !border-0" : ""
        }`}
      >
        {/* ==================================================================== */}
        {/* BARRA DE FERRAMENTAS COMPACTA SUPERIOR (TOOLBAR)                     */}
        {/* ==================================================================== */}
        <header className="h-14 px-3 sm:px-4 bg-surface-elevated/70 border-b border-border flex items-center justify-between gap-2 sm:gap-4 shrink-0 select-none">
          
          {/* LADO ESQUERDO: Identificação do Manual, Módulo e Versão */}
          <div className="flex items-center gap-2.5 min-w-0 max-w-[32%] sm:max-w-[35%]">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>

            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                  {manual?.module ? manual.module.toUpperCase() : "SYNGETI"}
                </span>
                {manual?.version && (
                  <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground font-semibold shrink-0">
                    v{manual.version}
                  </span>
                )}
              </div>
              <h2 
                id="modal-manual-title"
                className="text-xs sm:text-sm font-bold text-foreground truncate mt-0.5" 
                title={manual?.title || "Ajuda Contextual"}
              >
                {manual ? manual.title : "Manual Oficial"}
              </h2>
            </div>
          </div>

          {/* LADO CENTRO: Paginação, Zoom e Ajustes de Escala */}
          {manual && (
            <div className="flex items-center gap-1 sm:gap-2">
              
              {/* Paginação */}
              <div className="flex items-center bg-background border border-border rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 sm:p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Página Anterior"
                  aria-label="Página Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <span className="px-2 text-[10px] sm:text-xs font-semibold text-foreground font-mono whitespace-nowrap">
                  {currentPage} <span className="text-muted-foreground">/ {totalPages}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 sm:p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Próxima Página"
                  aria-label="Próxima Página"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Separador Vertical */}
              <div className="hidden sm:block h-5 w-px bg-border mx-0.5" />

              {/* Controles de Zoom Manual */}
              <div className="flex items-center bg-background border border-border rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 sm:p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                  title="Diminuir Zoom"
                  aria-label="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <span 
                  className="px-2 text-[10px] sm:text-xs font-semibold text-foreground font-mono w-14 sm:w-16 text-center truncate"
                  title={`Escala Atual: ${scaleMode === "page-fit" ? "Ajustar à Página" : scaleMode === "page-width" ? "Ajustar à Largura" : `${zoomLevel}%`}`}
                >
                  {scaleMode === "page-fit" ? "Página" : scaleMode === "page-width" ? "Largura" : `${zoomLevel}%`}
                </span>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 sm:p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                  title="Aumentar Zoom"
                  aria-label="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Presets: Ajustar à Página (Fit Page) & Ajustar à Largura (Fit Width) */}
              <div className="hidden md:flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleFitPage}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs ${
                    scaleMode === "page-fit"
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-surface"
                  }`}
                  title="Ajustar à Página (Exibe a página inteira sem cortes ou rolagem)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Ajustar à Página</span>
                </button>

                <button
                  type="button"
                  onClick={handleFitWidth}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs ${
                    scaleMode === "page-width"
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-surface"
                  }`}
                  title="Ajustar à Largura (Preenche a largura disponível para leitura confortável)"
                >
                  <MoveHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Ajustar à Largura</span>
                </button>
              </div>

            </div>
          )}

          {/* LADO DIREITO: Miniaturas, Busca, Download, Fullscreen, Fechar */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            
            {/* Botão Mostrar/Ocultar Miniaturas (Recolhido por padrão) */}
            {totalPages > 1 && (
              <button
                type="button"
                onClick={() => setShowThumbnails((prev) => !prev)}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs ${
                  showThumbnails
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border bg-background hover:bg-surface text-muted-foreground hover:text-foreground"
                }`}
                title={showThumbnails ? "Ocultar Painel de Miniaturas" : "Mostrar Painel de Miniaturas"}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden xl:inline">Miniaturas</span>
              </button>
            )}

            {/* Botão Pesquisar */}
            {manual && (
              <button
                type="button"
                onClick={() => setShowSearch((prev) => !prev)}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all ${
                  showSearch
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border bg-background hover:bg-surface text-muted-foreground hover:text-foreground"
                }`}
                title="Pesquisar texto no manual"
                aria-label="Pesquisar no PDF"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Botão Baixar PDF */}
            {manual?.pdfUrl && (
              <a
                href={manual.pdfUrl}
                download={manual.fileName || `${manual.title}.pdf`}
                className="p-1.5 sm:p-2 rounded-xl border border-border bg-background hover:bg-surface text-muted-foreground hover:text-foreground transition-colors shadow-xs"
                title="Baixar Manual Oficial em PDF"
                aria-label="Download PDF"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {/* Botão Tela Inteira */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden sm:flex p-1.5 sm:p-2 rounded-xl border border-border bg-background hover:bg-surface text-muted-foreground hover:text-foreground transition-colors shadow-xs"
              title={isFullscreen ? "Sair da Tela Inteira" : "Expandir em Tela Inteira"}
              aria-label="Alternar Tela Inteira"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Botão Fechar Modal */}
            <button
              type="button"
              onClick={closeHelp}
              className="p-1.5 sm:p-2 rounded-xl border border-border bg-background hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground transition-colors shadow-xs ml-1"
              title="Fechar Manual (ESC)"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </header>

        {/* ==================================================================== */}
        {/* BARRA DE PESQUISA RÁPIDA EXPANSÍVEL (QUANDO ACIONADA)                */}
        {/* ==================================================================== */}
        {showSearch && (
          <div className="px-4 py-2.5 bg-surface border-b border-border flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleApplySearch} className="flex-1 max-w-lg flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Pesquisar termo no PDF (ex: chamado, relógio, ativo)..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-xs"
              >
                Buscar
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-2.5 py-1.5 rounded-xl bg-background border border-border hover:bg-surface text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
                >
                  Limpar
                </button>
              )}
            </form>

            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Dica: Você também pode usar <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl + F</kbd> para buscar diretamente na página.
            </span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* CORPO DO MODAL: PAINEL DE MINIATURAS + ÁREA DO VISUALIZADOR PDF      */}
        {/* ==================================================================== */}
        <div className="flex-1 flex overflow-hidden bg-neutral-900/10 relative min-h-0">
          
          {/* PAINEL LATERAL DE MINIATURAS (RECOLHÍVEL — EXPANDIDO APENAS SE SOLICITADO) */}
          {showThumbnails && totalPages > 1 && (
            <aside className="w-48 sm:w-56 border-r border-border bg-surface-elevated/40 flex flex-col shrink-0 animate-in slide-in-from-left duration-200 overflow-y-auto p-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Páginas ({totalPages})
                </span>
                <button
                  type="button"
                  onClick={() => setShowThumbnails(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface"
                  title="Recolher miniaturas"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lista de Miniaturas com Navegação Rápida */}
              <div className="space-y-2.5">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all group flex flex-col items-center gap-1.5 shadow-xs ${
                      currentPage === pageNum
                        ? "bg-primary/10 border-primary ring-2 ring-primary/20 text-primary"
                        : "bg-surface border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {/* Representação Gráfica da Página A4 */}
                    <div className="w-24 h-32 bg-white rounded border border-neutral-300 shadow-sm p-1.5 flex flex-col justify-between overflow-hidden">
                      <div className="w-full h-2 bg-primary/20 rounded-xs mb-1" />
                      <div className="space-y-1">
                        <div className="w-3/4 h-1 bg-neutral-200 rounded-xs" />
                        <div className="w-full h-1 bg-neutral-200 rounded-xs" />
                        <div className="w-5/6 h-1 bg-neutral-200 rounded-xs" />
                      </div>
                      <div className="w-full h-1 bg-neutral-200 rounded-xs" />
                    </div>

                    <span className="text-[11px] font-bold">
                      Página {pageNum}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* ÁREA PRINCIPAL: VISUALIZADOR DE DOCUMENTO AMPLO */}
          <main className="flex-1 h-full flex flex-col items-center justify-center relative overflow-hidden bg-neutral-900/30">
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
                <p className="text-sm font-bold text-foreground">Carregando manual oficial em PDF...</p>
                <p className="text-xs text-muted-foreground">Sincronizando com a Central de Conhecimento Wiki TI</p>
              </div>
            ) : manual ? (
              <div className="w-full h-full flex flex-col relative overflow-hidden bg-neutral-900/20">
                {/* Visualizador PDF em Iframe Nativo Isolado e Seguro */}
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  className="w-full h-full border-0 bg-white shadow-inner"
                  title={manual.title}
                />
              </div>
            ) : hasLoaded ? (
              /* SEÇÃO DE TRATAMENTO AMIGÁVEL QUANDO MANUAL NÃO ESTIVER PUBLICADO */
              <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-md">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">Manual ainda não disponível</h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    O manual desta funcionalidade ainda não foi publicado. Você pode consultar a Base de Conhecimento Wiki TI para encontrar outros manuais e orientações.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href="/knowledge"
                    onClick={closeHelp}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Abrir Wiki TI</span>
                  </Link>
                  <button
                    type="button"
                    onClick={closeHelp}
                    className="px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-foreground transition-colors"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : null}

          </main>
        </div>

        {/* ==================================================================== */}
        {/* BARRA INFERIOR / RODAPÉ: MANUAIS RELACIONADOS + ATALHO WIKI TI       */}
        {/* ==================================================================== */}
        <footer className="h-11 px-4 border-t border-border bg-surface-elevated/40 flex items-center justify-between text-xs shrink-0 select-none">
          
          {/* Manuais Relacionados deste Módulo (Chips Rápidos) */}
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar py-1">
            {relatedManuals.length > 0 ? (
              <>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground shrink-0 hidden sm:inline">
                  Outros Manuais:
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {relatedManuals.slice(0, 4).map((rel) => (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() => selectManual({ ...rel, pdfUrl: rel.pdfUrl, module: manual?.module })}
                      className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border text-[11px] font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 shadow-2xs whitespace-nowrap"
                      title={rel.title}
                    >
                      <FileText className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">{rel.title}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground truncate">
                {manual?.description || "Manual Oficial do Sistema Integrado de Gestão de TI"}
              </span>
            )}
          </div>

          {/* Link para a Wiki TI Completa */}
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <Link
              href="/knowledge"
              onClick={closeHelp}
              className="text-primary hover:underline font-bold text-xs flex items-center gap-1.5"
            >
              <span className="hidden md:inline">Ver Central de Manuais</span>
              <span>Wiki TI</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <span className="text-[10px] font-mono text-muted-foreground hidden lg:inline">
              SYNGETI • DocViewer
            </span>
          </div>

        </footer>

      </div>
    </div>
  );
}

// Exportação com ambos os nomes para retrocompatibilidade com AuthenticatedShell e testes automatizados
export const ContextualHelpDrawer = ContextualHelpModal;
