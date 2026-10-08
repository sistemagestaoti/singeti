"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContractForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
  "title": "",
  "type": "SUPPORT",
  "description": "",
  "total_value": 0
});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      router.push('/contracts');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        
          <div className="col-span-full sm:col-span-1">
            <label className="block text-sm font-medium text-foreground">Título do Contrato *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              
            >
              <option value="SUPPORT">SUPPORT</option>
              <option value="LICENSING">LICENSING</option>
              <option value="LEASING">LEASING</option>
              <option value="INTERNET">INTERNET</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div className="col-span-full">
            <label className="block text-sm font-medium text-foreground">Descrição</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              
            />
          </div>
          <div className="col-span-full sm:col-span-1">
            <label className="block text-sm font-medium text-foreground">Valor Total</label>
            <input
              type="number"
              value={formData.total_value}
              onChange={(e) => setFormData({ ...formData, total_value: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              
            />
          </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover disabled:opacity-50">
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
