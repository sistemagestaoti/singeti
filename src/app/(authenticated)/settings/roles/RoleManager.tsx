"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  Lock, 
  Eye, 
  Edit, 
  Zap,
  RotateCcw,
  SlidersHorizontal
} from "lucide-react";
import { 
  SYSTEM_MODULES, 
  PERMISSION_LEVEL_LABELS, 
  normalizePermissions, 
  PermissionLevel 
} from "@/lib/permissions";

export default function RoleManager({ 
  initialRoles 
}: { 
  initialRoles: any[] 
}) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  
  // Estado de criação / edição
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permMatrix, setPermMatrix] = useState<Record<string, PermissionLevel>>(() => {
    const init: Record<string, PermissionLevel> = {};
    for (const m of SYSTEM_MODULES) init[m.id] = "read";
    return init;
  });
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Iniciar criação de novo perfil
  const startNewRole = () => {
    setEditingRole(null);
    setName("");
    setDescription("");
    setErrorMsg(null);
    const init: Record<string, PermissionLevel> = {};
    for (const m of SYSTEM_MODULES) init[m.id] = "read";
    setPermMatrix(init);
  };

  // Iniciar edição de perfil existente
  const startEditRole = (role: any) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || "");
    setErrorMsg(null);
    const parsed = normalizePermissions(role.permissions);
    setPermMatrix(parsed);
  };

  // Altera o nível de permissão de um módulo específico
  const setModuleLevel = (moduleId: string, level: PermissionLevel) => {
    setPermMatrix(prev => ({
      ...prev,
      [moduleId]: level
    }));
  };

  // Ações em massa para todos os módulos
  const applyAll = (level: PermissionLevel) => {
    const updated: Record<string, PermissionLevel> = {};
    for (const m of SYSTEM_MODULES) {
      updated[m.id] = level;
    }
    setPermMatrix(updated);
  };

  // Submeter formulário (Criar ou Salvar Edição)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: name.trim().toUpperCase(),
        description: description.trim(),
        permissions: permMatrix
      };

      if (editingRole) {
        // Atualizar perfil existente
        const res = await fetch(`/api/roles/${editingRole.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha ao atualizar perfil.");

        setRoles(roles.map(r => r.id === editingRole.id ? { ...data, _count: editingRole._count } : r));
        alert("Perfil atualizado com sucesso!");
      } else {
        // Criar novo perfil
        const res = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha ao criar perfil.");

        setRoles([...roles, { ...data, _count: { users: 0 } }]);
        alert("Novo perfil criado com sucesso!");
        startNewRole();
      }

      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar perfil.");
    } finally {
      setLoading(false);
    }
  };

  // Excluir perfil
  const handleDeleteRole = async (role: any) => {
    if (role.name === "ADMINISTRADOR") {
      alert("O perfil mestre ADMINISTRADOR não pode ser excluído.");
      return;
    }

    if (role._count?.users > 0) {
      alert(`Não é possível excluir: existem ${role._count.users} usuário(s) associado(s) a este perfil.`);
      return;
    }

    if (!confirm(`Deseja realmente excluir o perfil "${role.name}"?`)) return;

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao excluir.");

      setRoles(roles.filter(r => r.id !== role.id));
      if (editingRole?.id === role.id) startNewRole();
      alert("Perfil excluído com sucesso.");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      
      {/* COLUNA ESQUERDA: LISTA DE PERFIS */}
      <div className="xl:col-span-5 bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border bg-surface-hover/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-foreground text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Perfis de Acesso Cadastrados ({roles.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione um perfil para editar ou clique no botão para criar um novo.
            </p>
          </div>
          <button
            onClick={startNewRole}
            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Novo Perfil"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>

        <ul className="divide-y divide-border/60 max-h-[750px] overflow-y-auto custom-scrollbar">
          {roles.length === 0 && (
            <li className="p-8 text-center text-muted-foreground text-sm">
              Nenhum perfil cadastrado no sistema.
            </li>
          )}
          {roles.map((role) => {
            const isSelected = editingRole?.id === role.id;
            const norm = normalizePermissions(role.permissions);
            const userCount = role._count?.users || 0;

            // Contar quantos módulos têm leitura, escrita ou acesso total
            const adminCount = SYSTEM_MODULES.filter(m => norm[m.id] === 'admin').length;
            const writeCount = SYSTEM_MODULES.filter(m => norm[m.id] === 'write').length;
            const readCount = SYSTEM_MODULES.filter(m => norm[m.id] === 'read').length;
            const blockedCount = SYSTEM_MODULES.filter(m => norm[m.id] === 'none').length;

            return (
              <li 
                key={role.id} 
                className={`p-5 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-primary/10 border-l-4 border-l-primary' 
                    : 'hover:bg-surface-hover'
                }`}
                onClick={() => startEditRole(role)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-base tracking-wide">
                        {role.name}
                      </span>
                      {role.name === 'ADMINISTRADOR' && (
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          Mestre
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {role.description || "Sem descrição informada."}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditRole(role);
                      }}
                      className="p-1.5 rounded-lg border border-border text-foreground hover:bg-surface hover:text-primary transition-colors"
                      title="Editar Perfil"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {role.name !== 'ADMINISTRADOR' && userCount === 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role);
                        }}
                        className="p-1.5 rounded-lg border border-danger/20 text-danger hover:bg-danger/10 transition-colors"
                        title="Excluir Perfil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Resumo de Níveis de Acesso */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border/40 text-[11px]">
                  <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    {userCount} {userCount === 1 ? 'colaborador' : 'colaboradores'}
                  </span>
                  
                  {adminCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                      {adminCount} Total
                    </span>
                  )}
                  {writeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                      {writeCount} Editar
                    </span>
                  )}
                  {readCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                      {readCount} Leitura
                    </span>
                  )}
                  {blockedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 font-bold">
                      {blockedCount} Bloqueado
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* COLUNA DIREITA: MATRIZ DE PERMISSÕES E FORMULÁRIO */}
      <div className="xl:col-span-7 bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col">
        <div className="flex justify-between items-center pb-4 mb-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              {editingRole ? `Editar Perfil: ${editingRole.name}` : "Novo Perfil de Acesso"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Escolha detalhadamente o que este grupo pode acessar, ler ou sobrescrever em cada módulo.
            </p>
          </div>
          {editingRole && (
            <button
              onClick={startNewRole}
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Criar Novo
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-semibold flex items-center gap-2">
            <X className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Nome do Perfil *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: TÉCNICO N2, AUDITOR, GESTOR"
                className="w-full bg-background border border-border text-foreground text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary font-bold transition-colors uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Descrição da Finalidade
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Permite abrir e atender chamados, sem acesso a cadastros"
                className="w-full bg-background border border-border text-foreground text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Barra de Ações Rápidas em Massa */}
          <div className="bg-surface-hover/60 border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Atalhos Rápidos:</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyAll('none')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 hover:bg-zinc-500/20 transition-colors"
              >
                Bloquear Tudo
              </button>
              <button
                type="button"
                onClick={() => applyAll('read')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                Tudo: Só Leitura
              </button>
              <button
                type="button"
                onClick={() => applyAll('write')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                Tudo: Editar/Gravar
              </button>
              <button
                type="button"
                onClick={() => applyAll('admin')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                Tudo: Acesso Total
              </button>
            </div>
          </div>

          {/* Matriz de Permissões Módulo a Módulo */}
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
            {SYSTEM_MODULES.map((module) => {
              const currentLevel = permMatrix[module.id] || 'none';

              return (
                <div 
                  key={module.id}
                  className="bg-background border border-border/70 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">
                        {module.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-muted">
                        {module.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {module.description}
                    </p>
                  </div>

                  {/* Seletor de Nível (4 Opções) */}
                  <div className="flex items-center bg-surface border border-border rounded-lg p-1 gap-1 flex-shrink-0 self-start md:self-center">
                    
                    {/* 1. Sem Acesso */}
                    <button
                      type="button"
                      onClick={() => setModuleLevel(module.id, 'none')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        currentLevel === 'none'
                          ? 'bg-zinc-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                      }`}
                      title="Bloquear acesso a este módulo"
                    >
                      <Lock className="w-3 h-3" />
                      <span className="hidden sm:inline">Bloqueado</span>
                    </button>

                    {/* 2. Somente Leitura */}
                    <button
                      type="button"
                      onClick={() => setModuleLevel(module.id, 'read')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        currentLevel === 'read'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                      }`}
                      title="Apenas consultar e ler, sem criar ou editar"
                    >
                      <Eye className="w-3 h-3" />
                      <span className="hidden sm:inline">Só Leitura</span>
                    </button>

                    {/* 3. Leitura e Edição */}
                    <button
                      type="button"
                      onClick={() => setModuleLevel(module.id, 'write')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        currentLevel === 'write'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                      }`}
                      title="Pode consultar, cadastrar novos e sobrescrever/editar dados"
                    >
                      <Edit className="w-3 h-3" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    {/* 4. Acesso Total */}
                    <button
                      type="button"
                      onClick={() => setModuleLevel(module.id, 'admin')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        currentLevel === 'admin'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                      }`}
                      title="Controle total do módulo (leitura, edição, exclusão e administração)"
                    >
                      <Zap className="w-3 h-3" />
                      <span className="hidden sm:inline">Total</span>
                    </button>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-border flex justify-end gap-3">
            {editingRole && (
              <button
                type="button"
                onClick={startNewRole}
                className="px-4 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold hover:bg-surface-hover transition-colors"
              >
                Cancelar Edição
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                "Salvando Permissões..."
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {editingRole ? "Salvar Alterações do Perfil" : "Salvar e Criar Perfil"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
