"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, X, Check, Save } from "lucide-react";

export default function DetailClient({ record, route, moduleName }: { record: any, route: string, moduleName: string }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(record);
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Deseja excluir permanentemente este registro?")) return;
    try {
      const res = await fetch(`/api/${route}/${record.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`/${route}`);
        router.refresh();
      } else {
        alert("Erro ao excluir.");
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/${route}/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        alert("Erro ao salvar.");
      }
    } catch(err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!confirm("Deseja marcar como resolvido/concluído?")) return;
    setFormData({ ...formData, status: "RESOLVED" });
    // Save it immediately
    const res = await fetch(`/api/${route}/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, status: "RESOLVED" })
    });
    if (res.ok) {
      router.refresh();
      window.location.reload();
    }
  };

  const handleClose = async () => {
    if (!confirm("Deseja encerrar este registro?")) return;
    setFormData({ ...formData, status: "CLOSED" });
    const res = await fetch(`/api/${route}/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, status: "CLOSED" })
    });
    if (res.ok) {
      router.refresh();
      window.location.reload();
    }
  };

  // Exclude internal fields from rendering
  const excludedKeys = ['id', 'company_id', 'created_at', 'updated_at', 'requester_id', 'author_id', 'manager_id', 'assigned_to_id'];
  const fields = Object.keys(record).filter(k => !excludedKeys.includes(k) && record[k] !== null && typeof record[k] !== 'object');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-surface p-6 rounded-2xl border border-border shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {moduleName}: {record.code || record.title || record.name || record.id}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Detalhes do registro.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isEditing ? (
            <>
              {record.status && record.status !== 'RESOLVED' && record.status !== 'CLOSED' && (
                <button onClick={handleResolve} className="bg-success/10 text-success border border-success/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-success/20 transition-colors">
                  <Check className="w-4 h-4" /> Resolver
                </button>
              )}
              {record.status && record.status !== 'CLOSED' && (
                <button onClick={handleClose} className="bg-muted text-foreground border border-border px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-surface-hover transition-colors">
                  <X className="w-4 h-4" /> Encerrar
                </button>
              )}
              <button onClick={() => setIsEditing(true)} className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/20 transition-colors">
                <Edit2 className="w-4 h-4" /> Editar
              </button>
              <button onClick={handleDelete} className="bg-danger/10 text-danger border border-danger/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-danger/20 transition-colors">
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conteúdo Dinâmico */}
      <div className="bg-surface shadow-sm border border-border rounded-2xl p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
          {fields.map(key => (
            <div key={key} className="col-span-1">
              <dt className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{key.replace('_', ' ')}</dt>
              <dd>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData[key] || ""}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none sm:text-sm font-medium"
                  />
                ) : (
                  <div className="text-sm font-medium text-foreground bg-background border border-border/50 rounded-md px-3 py-2">
                    {record[key]?.toString() || "-"}
                  </div>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

    </div>
  );
}
