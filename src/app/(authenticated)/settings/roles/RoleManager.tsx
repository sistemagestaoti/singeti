"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Check } from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  { id: "cmdb_read", label: "CMDB - Visualizar Ativos" },
  { id: "cmdb_write", label: "CMDB - Cadastrar/Editar Ativos" },
  { id: "tickets_read", label: "Chamados - Visualizar" },
  { id: "tickets_write", label: "Chamados - Abrir/Interagir" },
  { id: "tickets_admin", label: "Chamados - Administrar Todos" },
  { id: "projects_read", label: "Projetos - Visualizar" },
  { id: "users_admin", label: "Usuários - Cadastrar/Editar" },
  { id: "settings_admin", label: "Configurações - Acesso Total" },
];

export default function RoleManager({ 
  initialRoles 
}: { 
  initialRoles: any[]
}) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const togglePerm = (id: string) => {
    setSelectedPerms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          description, 
          permissions: JSON.stringify(selectedPerms) 
        }),
      });

      if (!res.ok) throw new Error("Falha ao criar perfil");

      const newRole = await res.json();
      setRoles([...roles, { ...newRole, _count: { users: 0 } }]);
      setName("");
      setDescription("");
      setSelectedPerms([]);
      router.refresh();
    } catch (error) {
      alert("Erro ao criar perfil. O nome pode já existir.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* List */}
      <div className="xl:col-span-2 bg-surface shadow-sm border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-hover">
          <h3 className="font-bold text-foreground">Perfis de Acesso ({roles.length})</h3>
        </div>
        <ul className="divide-y divide-border">
          {roles.length === 0 && (
            <li className="p-6 text-center text-muted-foreground">Nenhum perfil cadastrado.</li>
          )}
          {roles.map((role) => {
            const perms = JSON.parse(role.permissions || "[]");
            return (
              <li key={role.id} className="p-4 hover:bg-surface-hover transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-foreground">{role.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-background border border-border px-2.5 py-1 rounded-md">
                    <Shield className="w-3.5 h-3.5" />
                    {role._count?.users || 0} usuários
                  </div>
                </div>
                
                {/* Visualizar permissões compactas */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {perms.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Sem acessos definidos</span>
                  ) : (
                    perms.map((p: string) => (
                      <span key={p} className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground border border-accent">
                        {p}
                      </span>
                    ))
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Form */}
      <div className="bg-surface shadow-sm border border-border rounded-xl p-6 h-fit">
        <h3 className="font-bold text-foreground mb-4">Adicionar Novo Perfil</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium leading-6 text-foreground">Nome do Perfil</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-primary sm:text-sm"
              placeholder="Ex: Gestor de TI, N1 Suporte"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium leading-6 text-foreground">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-primary sm:text-sm"
              placeholder="Ex: Acesso total para equipe de campo"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <label className="block text-sm font-bold leading-6 text-foreground mb-3">Conceder Acessos a Módulos</label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {AVAILABLE_PERMISSIONS.map(perm => {
                const isSelected = selectedPerms.includes(perm.id);
                return (
                  <label key={perm.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-input'}`}>
                    <span className="text-sm font-medium text-foreground">{perm.label}</span>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-surface'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={isSelected}
                      onChange={() => togglePerm(perm.id)}
                    />
                  </label>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar Perfil"}
          </button>
        </form>
      </div>

    </div>
  );
}
