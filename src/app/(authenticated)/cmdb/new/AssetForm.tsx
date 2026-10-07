"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Entity = { id: string; name?: string; corporate_name?: string };

export default function AssetForm({
  companies,
  locations,
  departments,
}: {
  companies: Entity[];
  locations: Entity[];
  departments: Entity[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "COMPUTER",
    asset_tag: "",
    manufacturer: "",
    model: "",
    status: "IN_USE",
    company_id: companies[0]?.id || "",
    location_id: "",
    department_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Falha ao salvar ativo");

      router.push("/cmdb");
      router.refresh();
    } catch (error) {
      alert("Erro ao cadastrar ativo");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card shadow-sm border border-border rounded-lg p-6 space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Nome do Equipamento *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            placeholder="Ex: Notebook HP ProBook 440"
          />
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Código Patrimonial</label>
          <input
            type="text"
            value={formData.asset_tag}
            onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            placeholder="Ex: PAT-2026-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Tipo de Ativo</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
          >
            <option value="COMPUTER">Computador / Notebook</option>
            <option value="MONITOR">Monitor</option>
            <option value="PRINTER">Impressora</option>
            <option value="NETWORK">Equipamento de Rede</option>
            <option value="OTHER">Outros</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
          >
            <option value="IN_USE">Em Uso</option>
            <option value="IN_STOCK">Em Estoque</option>
            <option value="MAINTENANCE">Em Manutenção</option>
            <option value="RETIRED">Desativado / Descartado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Fabricante</label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-foreground ring-1 ring-inset ring-input sm:text-sm sm:leading-6"
          />
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Modelo</label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-foreground ring-1 ring-inset ring-input sm:text-sm sm:leading-6"
          />
        </div>
        
        <div className="col-span-full border-t border-border mt-4 pt-6 pb-2">
          <h3 className="text-base font-semibold leading-7 text-foreground">Atribuição Organizacional</h3>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Empresa *</label>
          <select
            required
            value={formData.company_id}
            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-foreground ring-1 ring-inset ring-input sm:text-sm sm:leading-6"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.corporate_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Localidade</label>
          <select
            value={formData.location_id}
            onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-foreground ring-1 ring-inset ring-input sm:text-sm sm:leading-6"
          >
            <option value="">Nenhuma</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-foreground">Departamento</label>
          <select
            value={formData.department_id}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-foreground ring-1 ring-inset ring-input sm:text-sm sm:leading-6"
          >
            <option value="">Nenhum</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

      </div>

      <div className="mt-8 flex justify-end gap-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-semibold leading-6 text-foreground hover:text-muted-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Ativo"}
        </button>
      </div>
    </form>
  );
}
