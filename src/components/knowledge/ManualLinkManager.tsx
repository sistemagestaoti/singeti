"use client";

import { useState } from "react";
import { Plus, Link as LinkIcon, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

export function ManualLinkManager({ initialManuals }: { initialManuals: any[] }) {
  const [manuals, setManuals] = useState<any[]>(initialManuals);
  const [module, setModule] = useState("service-desk");
  const [submodule, setSubmodule] = useState("");
  const [contextKey, setContextKey] = useState("");
  const [routePattern, setRoutePattern] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module || !contextKey || !title) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/manuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          submodule: submodule || null,
          context_key: contextKey,
          route_pattern: routePattern || `/${module}`,
          title,
          description,
          content_markdown: contentMarkdown,
          version: "1.0",
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar manual");
      const created = await res.json();
      setManuals((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setContentMarkdown("");
      setContextKey("");
      setSubmodule("");
      setMessage({ text: "Manual e vínculo contextual cadastrados com sucesso!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Falha ao cadastrar", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Criação/Vinculação de Manual */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs">
        <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-primary" />
          <span>Cadastrar / Vincular Novo Manual Contextual</span>
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Defina a tela ou rota que acionará este manual quando o usuário clicar no botão &quot;? Ajuda&quot;.
        </p>

        {message && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
          }`}>
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Módulo</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="dashboard">Dashboard</option>
                <option value="service-desk">Service Desk</option>
                <option value="connect">CONNECT CHAT</option>
                <option value="cmdb">CMDB / Ativos</option>
                <option value="pc-access">Gestão de PCs</option>
                <option value="knowledge">Wiki TI</option>
                <option value="users">Usuários</option>
                <option value="settings">Configurações</option>
                <option value="bookings">Reservas</option>
                <option value="contracts">Contratos</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Chave de Contexto (Única)</label>
              <input
                type="text"
                required
                value={contextKey}
                onChange={(e) => setContextKey(e.target.value)}
                placeholder="ex: service-desk/new ou connect/stickers"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Rota ou Padrão de URL</label>
              <input
                type="text"
                value={routePattern}
                onChange={(e) => setRoutePattern(e.target.value)}
                placeholder="ex: /service-desk/new"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">Título do Manual</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Manual — Como Abrir um Chamado"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">Descrição Breve</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resumo das instruções do manual"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">Conteúdo Instrucional (Markdown)</label>
            <textarea
              rows={4}
              value={contentMarkdown}
              onChange={(e) => setContentMarkdown(e.target.value)}
              placeholder="# Título do Manual&#10;### 1. Objetivo&#10;Instruções passo a passo..."
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Cadastrar Manual Oficial"}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Vínculos Existentes */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Manuais Vinculados ({manuals.length})
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left text-xs">
            <thead className="bg-surface-hover text-muted-foreground font-bold">
              <tr>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Chave de Contexto</th>
                <th className="px-4 py-3">Título do Manual</th>
                <th className="px-4 py-3">Versão</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {manuals.map((m) => (
                <tr key={m.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-primary capitalize">{m.module}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{m.context_key}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{m.title}</td>
                  <td className="px-4 py-3 font-mono">v{m.version}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={m.pdf_url || `/api/manuals/${encodeURIComponent(m.context_key)}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-bold text-xs"
                    >
                      Ver PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
