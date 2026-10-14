"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit2, Check, X, AlertCircle, Package, Layers } from "lucide-react";

export interface TicketItemInput {
  id?: string;
  description: string;
  quantity: number;
  category: string;
  asset_id?: string;
  unit?: string;
  notes?: string;
  status?: string;
}

export default function TicketForm({
  categories,
  assets,
  departments,
  initialTicket,
}: {
  categories: any[];
  assets: any[];
  departments: any[];
  initialTicket?: any;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Main Form Data
  const [formData, setFormData] = useState({
    title: initialTicket?.title || "",
    description: initialTicket?.description || "",
    type: initialTicket?.type || "INCIDENT",
    urgency: initialTicket?.urgency || "MEDIUM",
    impact: initialTicket?.impact || "MEDIUM",
    priority: initialTicket?.priority || "MEDIUM",
    category_id: initialTicket?.category_id || "",
    asset_id: initialTicket?.asset_id || "",
    group_id: initialTicket?.group_id || "",
  });

  // Dynamic Multiple Items State
  const [items, setItems] = useState<TicketItemInput[]>(
    initialTicket?.items?.map((it: any) => ({
      id: it.id,
      description: it.description,
      quantity: it.quantity || 1,
      category: it.category || "Hardware",
      asset_id: it.asset_id || "",
      unit: it.unit || "UN",
      notes: it.notes || "",
      status: it.status || "PENDING"
    })) || []
  );

  // Draft item being added or edited
  const [draftItem, setDraftItem] = useState<TicketItemInput>({
    description: "",
    quantity: 1,
    category: "Hardware",
    asset_id: "",
    unit: "UN",
    notes: ""
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

  // Calculate priority based on ITIL standard Matrix (Urgency x Impact)
  useEffect(() => {
    const calculatePriority = () => {
      const u = formData.urgency;
      const i = formData.impact;
      
      if (u === 'CRITICAL' || i === 'CRITICAL') return 'CRITICAL';
      if (u === 'HIGH' && i === 'HIGH') return 'CRITICAL';
      if ((u === 'HIGH' && i === 'MEDIUM') || (u === 'MEDIUM' && i === 'HIGH')) return 'HIGH';
      if ((u === 'LOW' && i === 'LOW')) return 'LOW';
      return 'MEDIUM';
    };
    
    setFormData(prev => ({ ...prev, priority: calculatePriority() }));
  }, [formData.urgency, formData.impact]);

  // Handle adding or updating item
  const handleSaveItem = () => {
    setItemError(null);
    if (!draftItem.description || !draftItem.description.trim()) {
      setItemError("Informe a descrição do item antes de adicionar.");
      return;
    }

    if (draftItem.quantity <= 0 || isNaN(draftItem.quantity)) {
      setItemError("A quantidade deve ser de no mínimo 1.");
      return;
    }

    if (editingIndex !== null) {
      // Update existing item
      setItems(prev => {
        const copy = [...prev];
        copy[editingIndex] = { ...draftItem, description: draftItem.description.trim() };
        return copy;
      });
      setEditingIndex(null);
    } else {
      // Add new item
      setItems(prev => [...prev, { ...draftItem, description: draftItem.description.trim() }]);
    }

    // Reset draft
    setDraftItem({
      description: "",
      quantity: 1,
      category: "Hardware",
      asset_id: "",
      unit: "UN",
      notes: ""
    });
  };

  const handleEditItem = (index: number) => {
    setDraftItem(items[index]);
    setEditingIndex(index);
    setItemError(null);
  };

  const handleCancelEditItem = () => {
    setEditingIndex(null);
    setDraftItem({
      description: "",
      quantity: 1,
      category: "Hardware",
      asset_id: "",
      unit: "UN",
      notes: ""
    });
    setItemError(null);
  };

  const handleRemoveItem = (index: number) => {
    if (editingIndex === index) {
      handleCancelEditItem();
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        items: items
      };

      const url = initialTicket?.id ? `/api/tickets/${initialTicket.id}` : "/api/tickets";
      const method = initialTicket?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar chamado");
      }

      const targetId = initialTicket?.id || data.id;
      router.push(`/service-desk/${targetId}`);
      router.refresh();
    } catch (error: any) {
      console.error("Erro ao salvar chamado:", error);
      setErrorMsg(error?.message || "Erro inesperado ao salvar chamado. Seus dados foram preservados.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface shadow-sm border border-border rounded-xl p-6 sm:p-8 space-y-8">
      
      {errorMsg && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Seção 1: Dados Principais do Chamado */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-4 pb-2 border-b border-border flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          1. Informações Principais do Chamado
        </h3>

        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          
          <div className="col-span-full">
            <label className="block text-sm font-semibold text-foreground">Título / Assunto do Chamado *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-2 block w-full rounded-lg border border-border bg-background py-2.5 px-3.5 text-foreground focus:outline-none focus:border-primary sm:text-sm"
              placeholder="Ex: Falha em computadores da produção ou Solicitação de novos periféricos"
            />
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-semibold text-foreground">Descrição Geral do Problema ou Necessidade *</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-2 block w-full rounded-lg border border-border bg-background py-2.5 px-3.5 text-foreground focus:outline-none focus:border-primary sm:text-sm"
              placeholder="Descreva o contexto geral, setor afetado e urgência da solicitação..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground">Tipo de Chamado</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-2 block w-full rounded-lg border border-border bg-background py-2.5 px-3.5 text-foreground focus:outline-none focus:border-primary sm:text-sm"
            >
              <option value="INCIDENT">Incidente (Falha / Quebra / Interrupção)</option>
              <option value="REQUEST">Requisição (Solicitação de Serviço / Novos Itens)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground">Categoria Geral</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="mt-2 block w-full rounded-lg border border-border bg-background py-2.5 px-3.5 text-foreground focus:outline-none focus:border-primary sm:text-sm"
            >
              <option value="">Selecione a categoria...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground">Urgência</label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              className="mt-2 block w-full rounded-lg border border-border bg-background py-2.5 px-3.5 text-foreground focus:outline-none focus:border-primary sm:text-sm"
            >
              <option value="LOW">Baixa (Pode aguardar)</option>
              <option value="MEDIUM">Média (Padrão corporativo)</option>
              <option value="HIGH">Alta (Urgente / Prejudica atividades)</option>
              <option value="CRITICAL">Crítica (Operação / Setor parado)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground">Impacto</label>
            <select
              value={formData.impact}
              onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
              className="mt-2 block w-full rounded-lg border border-border bg-background py-2.5 px-3.5 text-foreground focus:outline-none focus:border-primary sm:text-sm"
            >
              <option value="LOW">Baixo (Apenas um colaborador)</option>
              <option value="MEDIUM">Médio (Um departamento)</option>
              <option value="HIGH">Alto (Vários departamentos)</option>
              <option value="CRITICAL">Crítico (Organização inteira paralisada)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground">Prioridade Calculada (ITIL)</label>
            <div className="mt-2 block w-full rounded-lg border border-border py-2.5 px-3.5 bg-muted text-foreground sm:text-sm font-bold flex items-center justify-between">
              <span>Nível de Atendimento:</span>
              {formData.priority === 'CRITICAL' && <span className="text-danger bg-danger/10 px-2 py-0.5 rounded">Crítica</span>}
              {formData.priority === 'HIGH' && <span className="text-warning bg-warning/10 px-2 py-0.5 rounded">Alta</span>}
              {formData.priority === 'MEDIUM' && <span className="text-primary bg-primary/10 px-2 py-0.5 rounded">Média</span>}
              {formData.priority === 'LOW' && <span className="text-muted-foreground bg-surface px-2 py-0.5 rounded">Baixa</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground">Grupo / Setor Responsável</label>
            <select
              value={formData.group_id}
              onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
              className="mt-2 block w-full rounded-lg border border-border bg-background py-2.5 px-3.5 text-foreground focus:outline-none focus:border-primary sm:text-sm"
            >
              <option value="">Não sei / Service Desk N1 (Triagem)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-semibold text-foreground">Equipamento Principal Vinculado (Opcional)</label>
            <select
              value={formData.asset_id}
              onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
              className="mt-2 block w-full rounded-lg border border-border bg-background py-2.5 px-3.5 text-foreground focus:outline-none focus:border-primary sm:text-sm"
            >
              <option value="">Nenhum ativo principal específico (ou especifique itens na lista abaixo)</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.asset_tag || a.internal_id})</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Seção 2: Gerenciamento Dinâmico de Múltiplos Itens */}
      <div className="pt-4 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              2. Itens, Equipamentos e Acessórios do Chamado
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adicione múltiplos itens a este chamado sem precisar abrir chamados avulsos para cada componente.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary self-start sm:self-auto">
            {items.length} {items.length === 1 ? 'item adicionado' : 'itens adicionados'}
          </span>
        </div>

        {/* Caixa de Entrada para Adicionar / Editar Item */}
        <div className="bg-surface-elevated border border-border rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {editingIndex !== null ? `Editando Item #${editingIndex + 1}` : 'Adicionar Novo Item à Solicitação'}
            </span>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={handleCancelEditItem}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancelar Edição
              </button>
            )}
          </div>

          {itemError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{itemError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Descrição do Item ou Acessório *
              </label>
              <input
                type="text"
                value={draftItem.description}
                onChange={(e) => setDraftItem({ ...draftItem, description: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveItem(); } }}
                placeholder="Ex: Teclado USB Dell, Troca de Memória RAM, Cabo DisplayPort..."
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                min="1"
                value={draftItem.quantity}
                onChange={(e) => setDraftItem({ ...draftItem, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Categoria do Item
              </label>
              <select
                value={draftItem.category}
                onChange={(e) => setDraftItem({ ...draftItem, category: e.target.value })}
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Hardware">Hardware / Equipamento</option>
                <option value="Periférico">Periférico (Teclado, Mouse, Headset)</option>
                <option value="Acessório">Acessório / Cabos / Adaptadores</option>
                <option value="Software">Software / Licença</option>
                <option value="Rede">Rede / Conectividade</option>
                <option value="Suprimento">Suprimento / Peça</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Ativo do CMDB Vinculado (Opcional)
              </label>
              <select
                value={draftItem.asset_id || ""}
                onChange={(e) => setDraftItem({ ...draftItem, asset_id: e.target.value || undefined })}
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Nenhum ativo específico</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.asset_tag || a.internal_id})</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Observações / Número de Série / Detalhe Adicional
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draftItem.notes || ""}
                  onChange={(e) => setDraftItem({ ...draftItem, notes: e.target.value })}
                  placeholder="Ex: Patrimônio 04512 ou Conector quebrado"
                  className="flex-1 rounded-lg border border-border bg-background py-2 px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleSaveItem}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  {editingIndex !== null ? (
                    <>
                      <Check className="w-4 h-4" /> Salvar Item
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Adicionar Item
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Tabela de Itens Adicionados */}
        {items.length === 0 ? (
          <div className="mt-3 py-6 px-4 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
            Nenhum item avulso adicionado até o momento. (Opcional: utilize os campos acima se este chamado envolver múltiplos itens ou periféricos).
          </div>
        ) : (
          <div className="mt-3 border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-border text-xs sm:text-sm">
              <thead className="bg-surface-hover">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase text-[11px]">#</th>
                  <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase text-[11px]">Descrição do Item</th>
                  <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[11px]">Qtd</th>
                  <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase text-[11px]">Categoria</th>
                  <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase text-[11px]">Ativo CMDB / Notas</th>
                  <th className="px-4 py-3 text-right font-bold text-muted-foreground uppercase text-[11px]">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {items.map((it, idx) => {
                  const linkedAsset = assets.find(a => a.id === it.asset_id);
                  const isBeingEdited = editingIndex === idx;

                  return (
                    <tr key={idx} className={`hover:bg-surface-hover/70 transition-colors ${isBeingEdited ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-3 text-muted-foreground font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {it.description}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-foreground">
                        {it.quantity} {it.unit || 'UN'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                          {it.category || 'Geral'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {linkedAsset ? (
                          <span className="font-semibold text-primary block truncate">
                            {linkedAsset.name} ({linkedAsset.asset_tag || linkedAsset.internal_id})
                          </span>
                        ) : null}
                        {it.notes ? <span className="block truncate">{it.notes}</span> : null}
                        {!linkedAsset && !it.notes && <span className="text-muted-foreground/50">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditItem(idx)}
                            title="Editar item"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            title="Remover item"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Botões de Ação do Formulário */}
      <div className="flex justify-end gap-x-4 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary px-7 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <span>Salvando Chamado...</span>
          ) : (
            <span>{initialTicket?.id ? "Salvar Alterações" : "Abrir Chamado"}</span>
          )}
        </button>
      </div>

    </form>
  );
}
