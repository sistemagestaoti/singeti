"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TicketForm({
  categories,
  assets,
  departments,
}: {
  categories: any[];
  assets: any[];
  departments: any[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "INCIDENT",
    urgency: "MEDIUM",
    impact: "MEDIUM",
    priority: "MEDIUM",
    category_id: "",
    asset_id: "",
    group_id: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Falha ao salvar chamado");

      const ticket = await res.json();
      router.push(`/service-desk/${ticket.id}`);
      router.refresh();
    } catch (error) {
      alert("Erro ao abrir chamado");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface shadow-sm border border-border rounded-lg p-6 space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        
        <div className="col-span-full">
          <label className="block text-sm font-medium leading-6 text-foreground">Título / Assunto *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            placeholder="Resumo do problema ou requisição"
          />
        </div>

        <div className="col-span-full">
          <label className="block text-sm font-medium leading-6 text-foreground">Descrição Detalhada *</label>
          <textarea
            required
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            placeholder="Descreva todos os sintomas, mensagens de erro e contexto."
          />
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Tipo de Chamado</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-2 pl-3 pr-10 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option value="INCIDENT">Incidente (Falha / Algo quebrou)</option>
            <option value="REQUEST">Requisição (Pedido de acesso / Novo item)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Ativo Relacionado</label>
          <select
            value={formData.asset_id}
            onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option value="">Nenhum ativo específico</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.asset_tag || a.internal_id})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Urgência</label>
          <select
            value={formData.urgency}
            onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option value="LOW">Baixa (Pode aguardar)</option>
            <option value="MEDIUM">Média (Padrão)</option>
            <option value="HIGH">Alta (Urgente)</option>
            <option value="CRITICAL">Crítica (Imediato)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Impacto</label>
          <select
            value={formData.impact}
            onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option value="LOW">Baixo (Um usuário)</option>
            <option value="MEDIUM">Médio (Um departamento)</option>
            <option value="HIGH">Alto (Vários departamentos)</option>
            <option value="CRITICAL">Crítico (Organização inteira parada)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Prioridade Calculada (ITIL)</label>
          <div className="mt-2 block w-full rounded-md border-0 py-2 px-3 bg-muted text-muted-foreground ring-1 ring-inset ring-border sm:text-sm font-semibold">
            {formData.priority === 'CRITICAL' && <span className="text-danger">Crítica</span>}
            {formData.priority === 'HIGH' && <span className="text-warning">Alta</span>}
            {formData.priority === 'MEDIUM' && <span>Média</span>}
            {formData.priority === 'LOW' && <span>Baixa</span>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Grupo / Setor de Triagem</label>
          <select
            value={formData.group_id}
            onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option value="">Não sei / Service Desk N1</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

      </div>

      <div className="mt-8 flex justify-end gap-x-4 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-semibold leading-6 text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? "Abrindo..." : "Abrir Chamado"}
        </button>
      </div>
    </form>
  );
}
