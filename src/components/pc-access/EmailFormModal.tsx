"use client";

import { useState, useEffect } from "react";
import { X, Mail, Shield, User, Lock, Check, Monitor } from "lucide-react";

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
  const [computers, setComputers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    email_address: "",
    account_name: "",
    password: "",
    provider: "M365",
    account_type: "INDIVIDUAL",
    collaborator_id: "",
    computer_id: computerId || "",
    status: "ACTIVE",
    auth_method: "SSO_SAML",
    mfa_enabled: "YES",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/pc-access/collaborators").then((r) => r.json()).catch(() => ({ items: [] })),
        fetch("/api/pc-access/computers?limit=100").then((r) => r.json()).catch(() => ({ items: [] })),
      ]).then(([collabRes, compRes]) => {
        setCollaborators(collabRes.items || []);
        setComputers(compRes.items || []);
      });

      if (initialData) {
        setFormData({
          email_address: initialData.email_address || "",
          account_name: initialData.account_name || "",
          password: "",
          provider: initialData.provider || "M365",
          account_type: initialData.account_type || "INDIVIDUAL",
          collaborator_id: initialData.collaborator?.id || initialData.collaborator_id || "",
          computer_id: initialData.computer?.id || initialData.computer_id || computerId || "",
          status: initialData.status || "ACTIVE",
          auth_method: initialData.auth_method || "SSO_SAML",
          mfa_enabled: initialData.mfa_enabled || "YES",
          notes: initialData.notes || "",
        });
      } else {
        setFormData({
          email_address: "",
          account_name: "",
          password: "",
          provider: "M365",
          account_type: "INDIVIDUAL",
          collaborator_id: "",
          computer_id: computerId || "",
          status: "ACTIVE",
          auth_method: "SSO_SAML",
          mfa_enabled: "YES",
          notes: "",
        });
      }
      setError(null);
    }
  }, [isOpen, initialData, computerId]);

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
        : { ...formData };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar conta de e-mail");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar e-mail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isEditing ? "Editar Conta de E-mail" : "Cadastrar Conta de E-mail"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Controle de e-mails corporativos, domínios, usuário responsável e senhas
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

        {/* Body com Scroll */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {error}
            </div>
          )}

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Endereço de E-mail Corporativo *
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-medium">Domínios corporativos:</span>
                <button
                  type="button"
                  onClick={() => {
                    const currentPrefix = formData.email_address.includes("@")
                      ? formData.email_address.split("@")[0].trim()
                      : formData.email_address.trim();
                    setFormData({ ...formData, email_address: `${currentPrefix || "usuario"}@dlamb.ind.br` });
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    formData.email_address.toLowerCase().endsWith("@dlamb.ind.br")
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-surface border-border text-blue-500 hover:bg-blue-500/10"
                  }`}
                  title="Aplicar domínio @dlamb.ind.br"
                >
                  @dlamb.ind.br
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentPrefix = formData.email_address.includes("@")
                      ? formData.email_address.split("@")[0].trim()
                      : formData.email_address.trim();
                    setFormData({ ...formData, email_address: `${currentPrefix || "usuario"}@eko21.ind.br` });
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    formData.email_address.toLowerCase().endsWith("@eko21.ind.br")
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-surface border-border text-emerald-500 hover:bg-emerald-500/10"
                  }`}
                  title="Aplicar domínio @eko21.ind.br"
                >
                  @eko21.ind.br
                </button>
              </div>
            </div>
            <input
              type="email"
              required
              value={formData.email_address}
              onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
              placeholder="Ex: maria.silva@dlamb.ind.br ou contato@eko21.ind.br"
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

          {/* Campo de Senha com Cofre Seguro */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
              <Shield className="w-4 h-4" />
              <span>Senha do E-mail (Cofre Seguro AES-256)</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isEditing
                ? "Preencha somente se desejar alterar ou atualizar a senha protegida deste e-mail. Se deixar vazio, a senha atual será mantida."
                : "A senha será criptografada no banco e protegida por cofre de segurança, visível somente por técnicos autorizados com auditoria."}
            </p>
            <div className="relative">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isEditing ? "Nova senha do e-mail (deixe vazio para manter)..." : "Digite a senha do e-mail..."}
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Colaborador / Usuário
              </label>
              <select
                value={formData.collaborator_id}
                onChange={(e) => setFormData({ ...formData, collaborator_id: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="">Selecione o Colaborador...</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.job_title ? `— ${c.job_title}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Computador Vinculado (Opcional)
              </label>
              <select
                value={formData.computer_id}
                onChange={(e) => setFormData({ ...formData, computer_id: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="">Nenhum computador específico</option>
                {computers.map((comp) => (
                  <option key={comp.id} value={comp.computer_id || comp.id}>
                    {comp.name} {comp.hostname ? `(${comp.hostname})` : ""}
                  </option>
                ))}
              </select>
            </div>
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
              placeholder="Instruções sobre encaminhamentos, licença atribuída ou dados de recuperação..."
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
              {loading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar E-mail"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
