"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
  "name": "",
  "description": "",
  "priority": "LOW",
  "status": "PLANNING"
});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      router.push('/projects');
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
            <label className="block text-sm font-medium text-foreground">Nome do Projeto *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              required
            />
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
          <div>
            <label className="block text-sm font-medium text-foreground">Prioridade</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              
            >
              <option value="PLANNING">PLANNING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELED">CANCELED</option>
            </select>
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
