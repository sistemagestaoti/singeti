"use client";

import { useState, useEffect } from "react";
import { X, Mail, ShieldCheck, User, Check } from "lucide-react";

interface EmailFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  computerId?: string;
  computerName?: string;
  initialData?: any | null;
}

export function EmailFormModal({
  isOpen,
  onClose,
  onSuccess,
  computerId,
  computerName,
  initialData,
}: EmailFormModalProps) {
  const isEditing = !!initialData;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    email_address: "",
    account_name: "",
    provider: "M365",
    account_type: "INDIVIDUAL",
    collaborator_id: "",
    status: "ACTIVE",
    auth_method: "SSO_SAML",
    mfa_enabled: "YES",
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
          email_address: initialData.email_address || "",
          account_name: initialData.account_name || "",
          provider: initialData.provider || "M365",
          account_type: initialData.account_type || "INDIVIDUAL",
          collaborator_id: initialData.collaborator?.id || initialData.collaborator_id || "",
          status: initialData.status || "ACTIVE",
          auth_method: initialData.auth_method || "SSO_SAML",
          mfa_enabled: initialData.mfa_enabled || "YES",
          notes: initialData.notes || "",
        });
      } else {
        setFormData({
          email_address: "",
          account_name: "",
          provider: "M365",
          account_type: "INDIVIDUAL",
          collaborator_id: "",
          status: "ACTIVE",
          auth_method: "SSO_SAML",
          mfa_enabled: "YES",
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
      const url = `/api/pc-access/emails`;
      const method = isEditing ? "PUT" : "POST";
      const payload = isEditing
        ? { ...formData, id: initialData.id }
        : { ...formData, computer_id: computerId || null };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar e-mail");
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
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isEditing ? "Editar E-mail Corporativo" : "Vincular E-mail Corporativo"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {computerName ? `Equipamento: ${computerName}` : "Controle de e-mails da organização"}
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

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Endereço de E-mail *
            </label>
            <input
              type="email"
              required
              value={formData.email_address}
              onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
              placeholder="Ex: maria.silva@empresa.com.br"
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nome do Titular / Caixa
            </label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="Ex: Maria Silva Pereira ou Caixa Financeiro"
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Provedor de E-mail
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
              >
                <option value="M365">Microsoft 365 / Exchange</option>
                <option value="GOOGLE_WORKSPACE">Google Workspace / Gmail</option>
                <option value="CORPORATE_IMAP">Servidor IMAP/SMTP Próprio</option>
                <option value="EXCHANGE">Exchange On-Premises</option>
                <option value="OUTRO">Outro Provedor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tipo de Conta
              </label>
              <select
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="INDIVIDUAL">Individual / Pessoal</option>
                <option value="SHARED_MAILBOX">Caixa Compartilhada (Shared)</option>
                <option value="DISTRIBUTION_LIST">Lista de Distribuição</option>
                <option value="SERVICE">Conta de Serviço / Notificações</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Colaborador Responsável
              </label>
              <select
                value={formData.collaborator_id}
                onChange={(e) => setFormData({ ...formData, collaborator_id: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="">Nenhum / Não atribuído</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Situação da Conta
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
              >
                <option value="ACTIVE">Ativo / Operacional</option>
                <option value="SUSPENDED">Suspenso / Bloqueado</option>
                <option value="DELETED">Desativado</option>
                <option value="REVIEW_PENDING">Revisão Pendente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Método de Autenticação
              </label>
              <select
                value={formData.auth_method}
                onChange={(e) => setFormData({ ...formData, auth_method: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="SSO_SAML">SSO / SAML / OAuth 2.0</option>
                <option value="OAUTH2">OAuth 2.0 Modern Auth</option>
                <option value="BASIC_AUTH">Senha / Autenticação Básica</option>
                <option value="APPPASSWORD">Senha de Aplicativo (App Password)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                MFA / 2FA Habilitado?
              </label>
              <select
                value={formData.mfa_enabled}
                onChange={(e) => setFormData({ ...formData, mfa_enabled: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
              >
                <option value="YES">Sim (MFA Ativo)</option>
                <option value="NO">Não (Sem MFA)</option>
                <option value="UNKNOWN">Desconhecido / Em verificação</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instruções sobre encaminhamentos, licença atribuída..."
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
              {loading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar E-mail"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
