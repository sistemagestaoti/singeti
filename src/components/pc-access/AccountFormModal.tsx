"use client";

import { useState, useEffect } from "react";
import { X, Key, Shield, User, Lock, Check } from "lucide-react";

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  computerId: string;
  computerName: string;
  initialData?: any | null;
}

export function AccountFormModal({
  isOpen,
  onClose,
  onSuccess,
  computerId,
  computerName,
  initialData,
}: AccountFormModalProps) {
  const isEditing = !!initialData;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    username: "",
    display_name: "",
    account_type: "LOCAL_STANDARD",
    domain: "WORKGROUP",
    status: "ACTIVE",
    collaborator_id: "",
    password: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetch("/api/pc-access/collaborators")
        .then((r) => r.json())
        .then((res) => setCollaborators(res.items || []))
        .catch(() => {});

      if (initialData) {
        setFormData({
          username: initialData.username || "",
          display_name: initialData.display_name || "",
          account_type: initialData.account_type || "LOCAL_STANDARD",
          domain: initialData.domain || "WORKGROUP",
          status: initialData.status || "ACTIVE",
          collaborator_id: initialData.collaborator?.id || initialData.collaborator_id || "",
          password: "",
          notes: initialData.notes || "",
        });
      } else {
        setFormData({
          username: "",
          display_name: "",
          account_type: "LOCAL_STANDARD",
          domain: "WORKGROUP",
          status: "ACTIVE",
          collaborator_id: "",
          password: "",
          notes: "",
        });
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = `/api/pc-access/accounts`;
      const method = isEditing ? "PUT" : "POST";
      const payload = isEditing
        ? { ...formData, id: initialData.id }
        : { ...formData, computer_id: computerId };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar conta");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isEditing ? "Editar Conta de Acesso" : "Adicionar Conta de Acesso"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Vinculada ao computador: <strong className="text-foreground">{computerName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nome de Usuário (Login) *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Ex: maria.silva, suporte"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Ex: Maria Silva"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tipo de Conta
              </label>
              <select
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
              >
                <option value="LOCAL_STANDARD">Usuário Local Padrão</option>
                <option value="LOCAL_ADMIN">Administrador Local</option>
                <option value="DOMAIN_USER">Usuário de Domínio (AD)</option>
                <option value="DOMAIN_ADMIN">Administrador de Domínio</option>
                <option value="ENTRA_ID">Microsoft Entra ID (Azure AD)</option>
                <option value="SERVICE_ACCOUNT">Conta de Serviço / Técnica</option>
                <option value="OUTRO">Outro Tipo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Domínio ou Provedor
              </label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="Ex: WORKGROUP, CORP.LOCAL"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Colaborador Titular (Opcional)
              </label>
              <select
                value={formData.collaborator_id}
                onChange={(e) => setFormData({ ...formData, collaborator_id: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="">Não atribuído / Conta compartilhada</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Status da Conta
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
              >
                <option value="ACTIVE">Ativa / Operacional</option>
                <option value="INACTIVE">Inativa / Desativada</option>
                <option value="LOCKED">Bloqueada</option>
                <option value="REVIEW_PENDING">Revisão Pendente</option>
              </select>
            </div>
          </div>

          {/* Campo de Senha com Aviso de Cofre */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
              <Shield className="w-4 h-4" />
              <span>Custódia de Senha no Cofre Seguro (AES-256-GCM)</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isEditing
                ? "Preencha apenas se desejar rotacionar/atualizar a senha protegida desta conta. Se deixar em branco, a credencial atual será mantida."
                : "A senha será criptografada no banco com AES-256 autenticado e protegida contra extração ou visualização não autorizada."}
            </p>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEditing ? "Nova senha (deixe vazio para manter)..." : "Senha da conta..."}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instruções de acesso, perfil ou restrições..."
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar Conta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
