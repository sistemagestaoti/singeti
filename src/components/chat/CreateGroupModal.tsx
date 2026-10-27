"use client";

import { useState } from "react";
import { X, Users, Hash, Check, Image as ImageIcon, Search, Shield } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  job_title?: string | null;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; name: string };
  users: User[];
  departments?: Array<{ id: string; name: string }>;
  onGroupCreated: (channel: any) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  currentUser,
  users,
  departments = [],
  onGroupCreated,
}: CreateGroupModalProps) {
  const [type, setType] = useState<"group" | "channel">("group");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedUserIds(users.map((u) => u.id));
  };

  const deselectAll = () => {
    setSelectedUserIds([]);
  };

  const handleSelectDepartment = (deptName: string) => {
    setSelectedDepartment(deptName);
    if (!name || name === selectedDepartment) {
      setName(`Canal - ${deptName}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (u.id === currentUser.id) return false;
    const term = searchUser.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.job_title && u.job_title.toLowerCase().includes(term))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome do grupo ou canal.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isGroup: true,
          name: name.trim(),
          description: description.trim() || (type === "channel" ? `Canal oficial de comunicação da equipe de ${selectedDepartment || name}` : null),
          memberIds: selectedUserIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Erro ao criar grupo");
      }

      const created = await res.json();
      onGroupCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Falha ao criar grupo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
              {type === "channel" ? <Hash className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {type === "channel" ? "Novo Canal por Departamento" : "Criar Novo Grupo de Trabalho"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {type === "channel" ? "Comunicação aberta entre equipes e setores" : "Conversa colaborativa com membros selecionados"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tipo de Grupo / Canal */}
        <div className="px-5 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-2 p-1 bg-background border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setType("group")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                type === "group" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Grupo de Trabalho</span>
            </button>
            <button
              type="button"
              onClick={() => setType("channel")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                type === "channel" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>Canal por Setor</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Atalho de Departamentos quando for Canal */}
          {type === "channel" && departments.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Vincular a um Departamento:</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => handleSelectDepartment(dept.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      selectedDepartment === dept.name
                        ? "bg-primary/15 border-primary text-primary font-bold"
                        : "bg-surface border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nome */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Nome do {type === "channel" ? "Canal" : "Grupo"} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "channel" ? "Ex: Manutenção TI, Qualidade, Logística" : "Ex: Compras Estratégicas, Comercial"}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Descrição / Objetivo:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste espaço para os colaboradores..."
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Seleção de Participantes */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Participantes ({selectedUserIds.length} selecionados)</span>
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-primary hover:underline font-semibold"
                >
                  Selecionar Todos
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-muted-foreground hover:text-foreground font-medium"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Busca de participante */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Filtrar colaboradores..."
                className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Lista de Usuários */}
            <div className="max-h-48 overflow-y-auto custom-scrollbar border border-border rounded-xl divide-y divide-border/60 bg-background/50">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Nenhum colaborador encontrado.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={`w-full flex items-center justify-between p-2.5 hover:bg-surface-hover text-left transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user.job_title || user.email}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected ? "bg-primary border-primary text-white" : "border-border bg-background"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-border bg-surface text-foreground text-xs font-bold hover:bg-surface-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              {loading ? "Criando..." : type === "channel" ? "Criar Canal" : "Criar Grupo"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
