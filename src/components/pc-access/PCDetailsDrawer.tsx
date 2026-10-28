"use client";

import { useState, useEffect } from "react";
import { 
  X, Monitor, Cpu, HardDrive, Wifi, Building, 
  Users, Key, Mail, History, HeadphonesIcon, 
  Edit, Plus, Trash2, Shield, Eye, Lock, 
  CheckCircle2, AlertCircle, Clock, ExternalLink, RefreshCw 
} from "lucide-react";
import Link from "next/link";
import { VaultRevealModal } from "./VaultRevealModal";
import { AccountFormModal } from "./AccountFormModal";
import { EmailFormModal } from "./EmailFormModal";
import { AssignUserModal } from "./AssignUserModal";
import { ComputerFormModal } from "./ComputerFormModal";

interface PCDetailsDrawerProps {
  computerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshList: () => void;
}

export function PCDetailsDrawer({
  computerId,
  isOpen,
  onClose,
  onRefreshList,
}: PCDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"general" | "users" | "accounts" | "emails" | "history" | "tickets">("general");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modais de ação rápida da ficha
  const [revealTarget, setRevealTarget] = useState<any | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<any | null>(null);
  const [isAssignUserModalOpen, setIsAssignUserModalOpen] = useState(false);
  const [isEditComputerModalOpen, setIsEditComputerModalOpen] = useState(false);

  const fetchDetails = async () => {
    if (!computerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pc-access/computers/${computerId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao carregar detalhes do computador");
      setData(json);
    } catch (err: any) {
      setError(err.message || "Erro de carregamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && computerId) {
      fetchDetails();
      setActiveTab("general");
    } else {
      setData(null);
    }
  }, [isOpen, computerId]);

  if (!isOpen || !computerId) return null;

  const asset = data?.asset;
  const computer = data?.computer;
  const assignments = data?.assignments || [];
  const accounts = data?.accounts || [];
  const emails = data?.email_accounts || [];
  const tickets = data?.tickets || [];
  const auditLogs = data?.audit_logs || [];

  const primaryAssignment = assignments.find((a: any) => a.is_primary && a.status === "ACTIVE");
  const activeAssignments = assignments.filter((a: any) => a.status === "ACTIVE");
  const pastAssignments = assignments.filter((a: any) => a.status !== "ACTIVE");

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta de acesso?")) return;
    try {
      const res = await fetch(`/api/pc-access/accounts?id=${accountId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir conta");
      fetchDetails();
      onRefreshList();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir conta");
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    if (!confirm("Tem certeza que deseja desvincular este e-mail?")) return;
    try {
      const res = await fetch(`/api/pc-access/emails?id=${emailId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir e-mail");
      fetchDetails();
      onRefreshList();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir e-mail");
    }
  };

  const handleUnassignUser = async (assignmentId: string) => {
    if (!confirm("Deseja encerrar o vínculo deste colaborador com o equipamento?")) return;
    try {
      const res = await fetch(`/api/pc-access/assignments?id=${assignmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao encerrar vínculo");
      fetchDetails();
      onRefreshList();
    } catch (err: any) {
      alert(err.message || "Erro ao desvincular");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="w-full max-w-4xl bg-surface border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header Drawer */}
          <div className="px-6 py-4 border-b border-border bg-surface-hover/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground truncate">
                    {asset?.name || "Carregando..."}
                  </h2>
                  {asset?.asset_tag && (
                    <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono font-semibold text-muted-foreground border border-border">
                      {asset.asset_tag}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      asset?.status === "IN_USE"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : asset?.status === "AVAILABLE"
                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        : asset?.status === "MAINTENANCE"
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {asset?.status === "IN_USE"
                      ? "Em Uso"
                      : asset?.status === "AVAILABLE"
                      ? "Disponível"
                      : asset?.status === "MAINTENANCE"
                      ? "Em Manutenção"
                      : asset?.status === "SPARE"
                      ? "Reserva"
                      : "Desativado"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hostname: <strong className="text-foreground">{computer?.hostname || "N/A"}</strong> | Código: {asset?.internal_id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchDetails}
                className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                title="Atualizar dados"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setIsEditComputerModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Edit className="w-3.5 h-3.5 text-primary" /> Editar
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Abas Superiores */}
          <div className="flex items-center px-6 border-b border-border bg-surface shrink-0 overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab("general")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "general"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="w-4 h-4" /> Informações Gerais
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "users"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" /> Usuários ({activeAssignments.length})
            </button>
            <button
              onClick={() => setActiveTab("accounts")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "accounts"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Key className="w-4 h-4" /> Acessos ao PC ({accounts.length})
            </button>
            <button
              onClick={() => setActiveTab("emails")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "emails"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="w-4 h-4" /> E-mails ({emails.length})
            </button>
            <button
              onClick={() => setActiveTab("tickets")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "tickets"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <HeadphonesIcon className="w-4 h-4" /> Chamados ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="w-4 h-4" /> Histórico & Auditoria
            </button>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading && !data ? (
              <div className="py-24 text-center text-xs text-muted-foreground animate-pulse">
                Carregando ficha técnica do computador...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
                {error}
              </div>
            ) : (
              <>
                {/* ABA 1: INFORMAÇÕES GERAIS */}
                {activeTab === "general" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Usuário Principal Destaque */}
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                            Usuário Principal / Responsável
                          </span>
                          <h4 className="text-base font-bold text-foreground">
                            {primaryAssignment?.collaborator?.name || "Nenhum colaborador atribuído"}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {primaryAssignment?.collaborator?.job_title || "Disponível em estoque ou compartilhado"}
                            {primaryAssignment?.collaborator?.email ? ` • ${primaryAssignment.collaborator.email}` : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsAssignUserModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {primaryAssignment ? "Trocar / Vincular" : "Vincular Responsável"}
                      </button>
                    </div>

                    {/* Blocos de Dados Técnicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Identificação */}
                      <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                          <Monitor className="w-4 h-4 text-primary" /> Identificação & Ativo
                        </h4>
                        <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Código Interno:</span>
                            <span className="font-semibold text-foreground font-mono">{asset.internal_id}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Patrimônio:</span>
                            <span className="font-semibold text-foreground font-mono">{asset.asset_tag || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Hostname:</span>
                            <span className="font-semibold text-foreground font-mono">{computer?.hostname || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Tipo:</span>
                            <span className="font-semibold text-foreground">{computer?.device_type || "DESKTOP"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Fabricante:</span>
                            <span className="font-semibold text-foreground">{asset.manufacturer || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Modelo:</span>
                            <span className="font-semibold text-foreground">{asset.model || "N/A"}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground block text-[11px]">Número de Série:</span>
                            <span className="font-semibold text-foreground font-mono">{asset.serial_number || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Configuração Técnica */}
                      <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                          <Cpu className="w-4 h-4 text-primary" /> Hardware & Sistema
                        </h4>
                        <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                          <div className="col-span-2">
                            <span className="text-muted-foreground block text-[11px]">Sistema Operacional:</span>
                            <span className="font-semibold text-foreground">
                              {computer?.os_name || "Windows"} {computer?.os_version ? `(${computer.os_version})` : ""}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground block text-[11px]">Processador (CPU):</span>
                            <span className="font-semibold text-foreground">{computer?.processor || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Memória RAM:</span>
                            <span className="font-semibold text-foreground font-mono">
                              {computer?.memory_mb ? `${computer.memory_mb / 1024} GB` : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Armazenamento:</span>
                            <span className="font-semibold text-foreground font-mono">
                              {computer?.storage_gb ? `${computer.storage_gb} GB` : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Endereço IP:</span>
                            <span className="font-semibold text-foreground font-mono">{computer?.ip_address || "DHCP / N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Endereço MAC:</span>
                            <span className="font-semibold text-foreground font-mono">{computer?.mac_address || "N/A"}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground block text-[11px]">Domínio / Workgroup:</span>
                            <span className="font-semibold text-foreground font-mono">{computer?.domain_workgroup || "WORKGROUP"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Localização */}
                      <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                          <Building className="w-4 h-4 text-primary" /> Localização & Alocação
                        </h4>
                        <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Unidade / Filial:</span>
                            <span className="font-semibold text-foreground">{asset.location?.name || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Setor:</span>
                            <span className="font-semibold text-foreground">{asset.department?.name || "N/A"}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground block text-[11px]">Local Físico Específico:</span>
                            <span className="font-semibold text-foreground">{computer?.physical_location || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Observações */}
                      <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                          <History className="w-4 h-4 text-primary" /> Observações & Registro
                        </h4>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {asset.notes || "Nenhuma observação técnica registrada."}
                        </p>
                        <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                          Cadastrado em {new Date(asset.created_at).toLocaleDateString("pt-BR")} | Última alteração em {new Date(asset.updated_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 2: USUÁRIOS & VÍNCULOS */}
                {activeTab === "users" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Colaboradores Vinculados</h3>
                        <p className="text-xs text-muted-foreground">Histórico e vínculos de utilização do computador</p>
                      </div>
                      <button
                        onClick={() => setIsAssignUserModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Vincular Colaborador
                      </button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vínculos Ativos</h4>
                      {activeAssignments.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-surface border border-dashed border-border text-xs text-muted-foreground">
                          Nenhum colaborador vinculado ativamente a este computador.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {activeAssignments.map((a: any) => (
                            <div
                              key={a.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                a.is_primary
                                  ? "bg-primary/5 border-primary/30 shadow-xs"
                                  : "bg-surface border-border"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground font-bold text-sm">
                                    {a.collaborator.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-sm font-bold text-foreground">{a.collaborator.name}</h5>
                                      {a.is_primary && (
                                        <span className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                                          Principal
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{a.collaborator.job_title || "Sem cargo"}</p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleUnassignUser(a.id)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                  title="Encerrar vínculo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                                <div>
                                  E-mail: <strong className="text-foreground">{a.collaborator.email || "N/A"}</strong>
                                </div>
                                <div>
                                  Setor: <strong className="text-foreground">{a.collaborator.department_name || "N/A"}</strong>
                                </div>
                                <div>
                                  Início: <strong className="text-foreground">{new Date(a.start_date).toLocaleDateString("pt-BR")}</strong>
                                </div>
                                <div>
                                  Atribuído por: <strong className="text-foreground">{a.assigned_by || "TI"}</strong>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {pastAssignments.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-border">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Histórico Anterior</h4>
                        <div className="rounded-xl border border-border overflow-hidden">
                          <table className="min-w-full divide-y divide-border text-left text-xs">
                            <thead className="bg-surface-hover text-muted-foreground font-bold">
                              <tr>
                                <th className="px-4 py-2.5">Colaborador</th>
                                <th className="px-4 py-2.5">Período</th>
                                <th className="px-4 py-2.5">Responsável</th>
                                <th className="px-4 py-2.5">Motivo / Notas</th>
                              </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border text-muted-foreground">
                              {pastAssignments.map((a: any) => (
                                <tr key={a.id}>
                                  <td className="px-4 py-2 font-medium text-foreground">{a.collaborator.name}</td>
                                  <td className="px-4 py-2">
                                    {new Date(a.start_date).toLocaleDateString("pt-BR")} até {a.end_date ? new Date(a.end_date).toLocaleDateString("pt-BR") : "Encerrado"}
                                  </td>
                                  <td className="px-4 py-2">{a.assigned_by || "TI"}</td>
                                  <td className="px-4 py-2">{a.notes || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 3: CONTAS DE ACESSO (WINDOWS / DOMÍNIO) */}
                {activeTab === "accounts" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Contas de Acesso ao Computador</h3>
                        <p className="text-xs text-muted-foreground">Logins locais, domínio e credenciais administrativas com cofre AES-256</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingAccount(null);
                          setIsAccountModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Conta
                      </button>
                    </div>

                    {accounts.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-surface border border-dashed border-border text-xs text-muted-foreground">
                        Nenhuma conta de acesso cadastrada para este computador.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {accounts.map((acc: any) => (
                          <div
                            key={acc.id}
                            className="p-4 rounded-2xl bg-surface border border-border hover:border-primary/40 transition-colors shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                  <Key className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-sm font-bold text-foreground font-mono">{acc.username}</h5>
                                    {acc.display_name && (
                                      <span className="text-xs text-muted-foreground font-normal">
                                        ({acc.display_name})
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground uppercase border border-border">
                                      {acc.account_type.replace(/_/g, " ")}
                                    </span>
                                    {acc.has_secret && (
                                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold flex items-center gap-1 border border-amber-500/20">
                                        <Shield className="w-3 h-3" /> Cofre Ativo
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Domínio: <strong className="text-foreground">{acc.domain}</strong> | Titular: {acc.collaborator?.name || "Conta de serviço / compartilhada"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {acc.has_secret && (
                                  <button
                                    onClick={() => setRevealTarget(acc)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-semibold border border-amber-500/20 transition-colors flex items-center gap-1.5 shadow-xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Revelar Senha
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setEditingAccount(acc);
                                    setIsAccountModalOpen(true);
                                  }}
                                  className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                                  title="Editar conta / Rotacionar senha"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteAccount(acc.id)}
                                  className="p-2 rounded-xl border border-border text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                  title="Remover conta"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Informações de Senha Mascarada */}
                            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-2 font-mono">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Senha:</span>
                                <strong className="text-foreground tracking-widest">
                                  {acc.has_secret ? "••••••••••••" : "Não custodiada no cofre"}
                                </strong>
                              </div>
                              <div>
                                {acc.last_password_change ? (
                                  <span>Última alteração: {new Date(acc.last_password_change).toLocaleDateString("pt-BR")}</span>
                                ) : (
                                  <span>Sem registro de troca</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 4: E-MAILS CORPORATIVOS */}
                {activeTab === "emails" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Contas de E-mail Corporativo</h3>
                        <p className="text-xs text-muted-foreground">Endereços Microsoft 365, Google Workspace e servidores corporativos</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingEmail(null);
                          setIsEmailModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Vincular E-mail
                      </button>
                    </div>

                    {emails.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-surface border border-dashed border-border text-xs text-muted-foreground">
                        Nenhuma conta de e-mail corporativo vinculada a este equipamento.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {emails.map((em: any) => (
                          <div
                            key={em.id}
                            className="p-4 rounded-2xl bg-surface border border-border hover:border-primary/40 transition-colors shadow-xs flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                                <Mail className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-bold text-foreground font-mono">{em.email_address}</h5>
                                  <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground border border-border">
                                    {em.provider}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      em.mfa_enabled === "YES"
                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                        : "bg-muted text-muted-foreground border border-border"
                                    }`}
                                  >
                                    MFA: {em.mfa_enabled === "YES" ? "Ativo" : "Não"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Titular: <strong className="text-foreground">{em.account_name || em.collaborator?.name || "N/A"}</strong> | Tipo: {em.account_type}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingEmail(em);
                                  setIsEmailModalOpen(true);
                                }}
                                className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmail(em.id)}
                                className="p-2 rounded-xl border border-border text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 5: HISTÓRICO & AUDITORIA */}
                {activeTab === "history" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Trilha de Auditoria & Modificações</h3>
                      <p className="text-xs text-muted-foreground">Registro cronológico de acessos, alterações de configuração e consultas ao cofre</p>
                    </div>

                    {auditLogs.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-surface border border-dashed border-border text-xs text-muted-foreground">
                        Nenhum evento registrado ainda para este equipamento.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {auditLogs.map((log: any) => (
                          <div
                            key={log.id}
                            className="p-3.5 rounded-xl bg-surface border border-border flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{log.action.replace(/_/g, " ")}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    log.status === "SUCCESS"
                                      ? "bg-emerald-500/10 text-emerald-500"
                                      : "bg-rose-500/10 text-rose-500"
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </div>
                              <p className="text-muted-foreground">{log.details || "Operação realizada com sucesso"}</p>
                              <div className="text-[11px] text-muted-foreground">
                                Executor: <strong className="text-foreground">{log.user_name || "TI"}</strong> {log.user_email ? `(${log.user_email})` : ""}
                              </div>
                            </div>

                            <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 6: CHAMADOS VINCULADOS */}
                {activeTab === "tickets" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Chamados do Service Desk</h3>
                        <p className="text-xs text-muted-foreground">Histórico de suporte e atendimentos vinculados a este computador</p>
                      </div>
                      <Link
                        href={`/service-desk?new=true&asset_id=${asset.id}`}
                        className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Abrir Chamado para este PC
                      </Link>
                    </div>

                    {tickets.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-surface border border-dashed border-border text-xs text-muted-foreground">
                        Nenhum chamado de suporte associado a este equipamento até o momento.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tickets.map((t: any) => (
                          <div
                            key={t.id}
                            className="p-4 rounded-2xl bg-surface border border-border hover:border-primary/40 transition-colors shadow-xs flex items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-primary">#{t.ticket_number}</span>
                                <h5 className="text-sm font-bold text-foreground">{t.title}</h5>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    t.status === "CLOSED" || t.status === "RESOLVED"
                                      ? "bg-muted text-muted-foreground border border-border"
                                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  }`}
                                >
                                  {t.status}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Solicitante: {t.requester?.name || "Usuário"} | Responsável: {t.assigned_to?.name || "Não atribuído"} | Prioridade: {t.priority}
                              </p>
                            </div>

                            <Link
                              href={`/service-desk/${t.id}`}
                              className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1 shrink-0"
                            >
                              Ver Chamado <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modais filhos */}
      {revealTarget && (
        <VaultRevealModal
          isOpen={!!revealTarget}
          onClose={() => setRevealTarget(null)}
          accountId={revealTarget.id}
          accountUsername={revealTarget.username}
          computerName={computer?.hostname || asset?.name || "Computador"}
        />
      )}

      {isAccountModalOpen && (
        <AccountFormModal
          isOpen={isAccountModalOpen}
          onClose={() => {
            setIsAccountModalOpen(false);
            setEditingAccount(null);
          }}
          onSuccess={() => {
            fetchDetails();
            onRefreshList();
          }}
          computerId={computer?.id}
          computerName={computer?.hostname || asset?.name || "Computador"}
          initialData={editingAccount}
        />
      )}

      {isEmailModalOpen && (
        <EmailFormModal
          isOpen={isEmailModalOpen}
          onClose={() => {
            setIsEmailModalOpen(false);
            setEditingEmail(null);
          }}
          onSuccess={() => {
            fetchDetails();
            onRefreshList();
          }}
          computerId={computer?.id}
          computerName={computer?.hostname || asset?.name || "Computador"}
          initialData={editingEmail}
        />
      )}

      {isAssignUserModalOpen && (
        <AssignUserModal
          isOpen={isAssignUserModalOpen}
          onClose={() => setIsAssignUserModalOpen(false)}
          onSuccess={() => {
            fetchDetails();
            onRefreshList();
          }}
          computerId={computer?.id}
          computerName={computer?.hostname || asset?.name || "Computador"}
        />
      )}

      {isEditComputerModalOpen && (
        <ComputerFormModal
          isOpen={isEditComputerModalOpen}
          onClose={() => setIsEditComputerModalOpen(false)}
          onSuccess={() => {
            fetchDetails();
            onRefreshList();
          }}
          initialData={{
            ...asset,
            ...computer,
            department: asset?.department,
            location: asset?.location,
            primary_user: primaryAssignment?.collaborator,
          }}
        />
      )}
    </>
  );
}
