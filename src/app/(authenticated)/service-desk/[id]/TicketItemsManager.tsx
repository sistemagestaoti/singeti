"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, Package, Tag, AlertCircle } from "lucide-react";

interface TicketItem {
  id: string;
  description: string;
  quantity: number;
  unit?: string | null;
  category?: string | null;
  notes?: string | null;
  asset_id?: string | null;
  asset?: {
    id: string;
    name: string;
    asset_tag?: string | null;
    internal_id?: string | null;
  } | null;
}

const CATEGORIES = [
  "Hardware",
  "Software",
  "Periférico",
  "Rede",
  "Acessório",
  "Suprimento",
  "Serviço",
  "Outro"
];

export default function TicketItemsManager({ 
  ticketId, 
  initialItems = [] 
}: { 
  ticketId: string; 
  initialItems: TicketItem[];
}) {
  const [items, setItems] = useState<TicketItem[]>(initialItems);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for adding
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState("UN");
  const [newCategory, setNewCategory] = useState("Hardware");
  const [newNotes, setNewNotes] = useState("");

  // Form states for editing
  const [editDesc, setEditDesc] = useState("");
  const [editQty, setEditQty] = useState(1);
  const [editUnit, setEditUnit] = useState("UN");
  const [editCategory, setEditCategory] = useState("Hardware");
  const [editNotes, setEditNotes] = useState("");

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) {
      setError("A descrição do item é obrigatória.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newDesc.trim(),
          quantity: Number(newQty) || 1,
          unit: newUnit.trim() || "UN",
          category: newCategory,
          notes: newNotes.trim() || null
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao adicionar item.");
      }

      const created = await res.json();
      setItems(prev => [...prev, created]);
      setNewDesc("");
      setNewQty(1);
      setNewUnit("UN");
      setNewNotes("");
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || "Falha ao gravar item.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: TicketItem) => {
    setEditingItemId(item.id);
    setEditDesc(item.description);
    setEditQty(item.quantity);
    setEditUnit(item.unit || "UN");
    setEditCategory(item.category || "Hardware");
    setEditNotes(item.notes || "");
    setError(null);
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setError(null);
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editDesc.trim()) {
      setError("A descrição do item não pode ficar vazia.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDesc.trim(),
          quantity: Number(editQty) || 1,
          unit: editUnit.trim() || "UN",
          category: editCategory,
          notes: editNotes.trim() || null
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao atualizar item.");
      }

      const updated = await res.json();
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...updated } : it));
      setEditingItemId(null);
    } catch (err: any) {
      setError(err.message || "Falha ao atualizar item.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemDescription: string) => {
    if (!confirm(`Remover "${itemDescription}" deste chamado?`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/items/${itemId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir item.");
      }

      setItems(prev => prev.filter(it => it.id !== itemId));
    } catch (err: any) {
      setError(err.message || "Falha ao excluir item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface shadow-sm rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <span>Itens e Componentes da Solicitação</span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
        </h3>
        
        {!showAddForm && (
          <button
            type="button"
            onClick={() => { setShowAddForm(true); setError(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-xs font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Item
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário para Adicionar Item */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="p-4 bg-surface-hover/70 border border-border rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-foreground">Novo Item do Chamado</span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Descrição *</label>
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Ex: Teclado Mecânico USB, Memória 16GB..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Qtd *</label>
              <input
                type="number"
                min="1"
                value={newQty}
                onChange={e => setNewQty(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Categoria</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-12">
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Observações / Patrimônio (opcional)</label>
              <input
                type="text"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Ex: Tag de patrimônio, especificações, motivo da substituição..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-surface border border-transparent hover:border-border transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? "Salvando..." : "Salvar Item"}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Itens */}
      {items.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs font-semibold text-muted-foreground">Nenhum item específico vinculado a este chamado.</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Você pode adicionar itens ou equipamentos a qualquer momento.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-border text-xs sm:text-sm">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase text-[11px]">#</th>
                <th className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase text-[11px]">Descrição</th>
                <th className="px-4 py-2.5 text-center font-bold text-muted-foreground uppercase text-[11px]">Qtd</th>
                <th className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase text-[11px]">Categoria</th>
                <th className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase text-[11px]">Detalhes / Notas</th>
                <th className="px-4 py-2.5 text-right font-bold text-muted-foreground uppercase text-[11px]">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {items.map((it, idx) => {
                const isEditing = editingItemId === it.id;

                if (isEditing) {
                  return (
                    <tr key={it.id} className="bg-surface-hover/80">
                      <td className="px-4 py-2.5 font-bold text-primary">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:border-primary outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          value={editQty}
                          onChange={e => setEditQty(Number(e.target.value))}
                          className="w-16 bg-background border border-border rounded px-2 py-1 text-xs text-center text-foreground focus:border-primary outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:border-primary outline-none"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="Notas opcionais..."
                          className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:border-primary outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(it.id)}
                          disabled={loading}
                          className="p-1 rounded bg-success/10 text-success hover:bg-success/20 transition-colors"
                          title="Salvar alterações"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="p-1 rounded bg-muted text-muted-foreground hover:bg-surface-hover transition-colors"
                          title="Cancelar edição"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={it.id} className="hover:bg-surface-hover/70 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground font-semibold">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{it.description}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-foreground">{it.quantity} {it.unit || 'UN'}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                        {it.category || 'Geral'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {it.asset ? (
                        <span className="font-semibold text-primary block">
                          {it.asset.name} ({it.asset.asset_tag || it.asset.internal_id})
                        </span>
                      ) : null}
                      {it.notes ? <span className="block text-foreground/80">{it.notes}</span> : null}
                      {!it.asset && !it.notes && <span className="text-muted-foreground/40">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(it)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Editar item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(it.id, it.description)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Excluir item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
