"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

export default function DepartmentManager({ 
  initialDepartments, 
  companyId 
}: { 
  initialDepartments: any[],
  companyId: string 
}) {
  const router = useRouter();
  const [departments, setDepartments] = useState(initialDepartments);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company_id: companyId }),
      });

      if (!res.ok) throw new Error("Falha ao criar departamento");

      const newDept = await res.json();
      setDepartments([...departments, { ...newDept, _count: { users: 0 } }]);
      setName("");
      router.refresh();
    } catch (error) {
      alert("Erro ao criar departamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* List */}
      <div className="lg:col-span-2 bg-surface shadow-sm border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-hover">
          <h3 className="font-bold text-foreground">Departamentos Ativos ({departments.length})</h3>
        </div>
        <ul className="divide-y divide-border">
          {departments.length === 0 && (
            <li className="p-6 text-center text-muted-foreground">Nenhum departamento cadastrado.</li>
          )}
          {departments.map((dept) => (
            <li key={dept.id} className="p-4 flex justify-between items-center hover:bg-surface-hover transition-colors">
              <div>
                <p className="font-bold text-foreground">{dept.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ID: {dept.id.substring(0, 8)}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-background border border-border px-2.5 py-1 rounded-md">
                <Users className="w-3.5 h-3.5" />
                {dept._count?.users || 0} usuários
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <div className="bg-surface shadow-sm border border-border rounded-xl p-6 h-fit">
        <h3 className="font-bold text-foreground mb-4">Adicionar Departamento</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium leading-6 text-foreground">Nome do Departamento</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-primary sm:text-sm"
              placeholder="Ex: Financeiro, TI, RH"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar Departamento"}
          </button>
        </form>
      </div>

    </div>
  );
}
