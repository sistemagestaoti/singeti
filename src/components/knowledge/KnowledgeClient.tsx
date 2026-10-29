"use client";

import { useState, useMemo } from "react";
import { 
  BookOpen, Search, Download, Eye, FileText, ExternalLink, 
  Layers, CheckCircle2, Shield, Plus, ArrowLeft, RefreshCw 
} from "lucide-react";
import Link from "next/link";
import { useContextualHelp } from "@/components/help/ContextualHelpContext";

export interface ManualItem {
  id: string;
  module: string;
  submodule?: string | null;
  context_key: string;
  route_pattern: string;
  title: string;
  description?: string | null;
  version: string;
  tags?: string | null;
  pdf_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  content_markdown?: string | null;
  updated_at: string;
}

export function KnowledgeClient({
  initialManuals,
  articles,
}: {
  initialManuals: ManualItem[];
  articles: any[];
}) {
  const [activeTab, setActiveTab] = useState<"manuals" | "articles" | "admin">("manuals");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const { openHelp, selectManual } = useContextualHelp();

  // Módulos disponíveis extraídos dinamicamente
  const modulesList = useMemo(() => {
    const set = new Set<string>();
    initialManuals.forEach((m) => set.add(m.module));
    return ["ALL", ...Array.from(set).sort()];
  }, [initialManuals]);

  // Filtro inteligente de Manuais
  const filteredManuals = useMemo(() => {
    return initialManuals.filter((m) => {
      if (selectedModule !== "ALL" && m.module !== selectedModule) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchDesc = (m.description || "").toLowerCase().includes(q);
        const matchTags = (m.tags || "").toLowerCase().includes(q);
        const matchContent = (m.content_markdown || "").toLowerCase().includes(q);
        return matchTitle || matchDesc || matchTags || matchContent;
      }
      return true;
    });
  }, [initialManuals, selectedModule, searchQuery]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* CABEÇALHO DA WIKI TI COM NAVEGAÇÃO DE ABAS */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold uppercase tracking-wider">
              Central Oficial de Conhecimento
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 tracking-tight">
            Base de Conhecimento — Wiki TI
          </h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
            Consulte manuais oficiais em PDF por módulo, procedimentos operacionais e tutoriais da plataforma SYNGETI.
          </p>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center gap-1.5 bg-background p-1.5 rounded-xl border border-border self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("manuals")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "manuals"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Manuais Oficiais PDF ({initialManuals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("articles")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "articles"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Artigos & Procedimentos ({articles.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: CENTRAL DE MANUAIS OFICIAIS DO SYNGETI (PDFs POR MÓDULO E SUBABA) */}
      {/* ========================================================================= */}
      {activeTab === "manuals" && (
        <div className="space-y-6">
          
          {/* BARRA DE PESQUISA INTELIGENTE E FILTRO POR MÓDULO */}
          <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar nos manuais (ex: abrir chamado, figurinhas, pc)..."
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Pílulas de Módulos */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
              {modulesList.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setSelectedModule(mod)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-colors ${
                    selectedModule === mod
                      ? "bg-primary text-white shadow-xs"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {mod === "ALL" ? "Todos os Módulos" : mod.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* GRID DE MANUAIS OFICIAIS */}
          {filteredManuals.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface border border-dashed border-border space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">Nenhum manual encontrado para esta pesquisa</p>
              <p className="text-xs text-muted-foreground">Tente buscar por termos mais genéricos ou selecione &quot;Todos os Módulos&quot;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredManuals.map((m) => (
                <div
                  key={m.id}
                  className="bg-surface rounded-2xl border border-border hover:border-primary/50 transition-all p-5 flex flex-col justify-between shadow-xs group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                        {m.module.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">
                        v{m.version}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {m.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {m.description || "Manual oficial de utilização com instruções passo a passo."}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {m.file_size ? `${(m.file_size / 1024).toFixed(0)} KB • PDF Leve` : "PDF Vetorial"}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Botão Visualizar no Painel de Ajuda */}
                      <button
                        type="button"
                        onClick={() => {
                          selectManual({
                            id: m.id,
                            title: m.title,
                            module: m.module,
                            version: m.version,
                            pdfUrl: m.pdf_url || `/api/manuals/${encodeURIComponent(m.context_key)}/pdf`,
                            fileName: m.file_name || `${m.title}.pdf`,
                            description: m.description,
                            contentMarkdown: m.content_markdown,
                          });
                          openHelp(m.context_key);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visualizar</span>
                      </button>

                      {/* Botão Baixar PDF */}
                      <a
                        href={m.pdf_url || `/api/manuals/${encodeURIComponent(m.context_key)}/pdf`}
                        download={m.file_name || `${m.title}.pdf`}
                        className="p-1.5 rounded-xl border border-border bg-background hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                        title="Baixar Arquivo PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: ARTIGOS GERAIS DA BASE DE CONHECIMENTO (WIKI TI EXISTENTE)        */}
      {/* ========================================================================= */}
      {activeTab === "articles" && (
        <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Artigos Publicados</h3>
            <Link
              href="/knowledge/new"
              className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
            >
              + Novo Artigo
            </Link>
          </div>

          <ul role="list" className="divide-y divide-border">
            {articles.length === 0 ? (
              <li className="px-6 py-12 text-center text-xs text-muted-foreground">
                Nenhum artigo adicional cadastrado na Wiki TI.
              </li>
            ) : (
              articles.map((article: any) => (
                <li key={article.id} className="p-4 hover:bg-surface-hover transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/knowledge/${article.id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors block truncate">
                      {article.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Categoria: <strong className="text-foreground">{article.category}</strong> • Autor: {article.author?.name || "TI"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      {article.view_count || 0} visualizações
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

    </div>
  );
}
