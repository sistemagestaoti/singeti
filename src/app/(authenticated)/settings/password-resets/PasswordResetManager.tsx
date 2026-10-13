"use client";

import { useState } from "react";
import { 
  KeyRound, Search, CheckCircle2, Clock, AlertTriangle, XCircle, 
  Copy, ExternalLink, ShieldAlert, History, User, Lock, Check, RefreshCw
} from "lucide-react";

type ResetRequest = {
  id: string;
  protocol: string;
  user_id?: string | null;
  user_name: string;
  username: string;
  user_email: string;
  status: string; // PENDING, IN_PROGRESS, RESOLVED, CANCELLED
  reset_token?: string | null;
  token_expires_at?: string | null;
  admin_id?: string | null;
  admin_name?: string | null;
  admin_notes?: string | null;
  history?: string | null;
  created_at: string | Date;
  resolved_at?: string | Date | null;
  user?: {
    id: string;
    name: string;
    email: string;
    job_title?: string | null;
    role?: { name: string } | null;
    department?: { name: string } | null;
  } | null;
};

export default function PasswordResetManager({ 
  initialRequests, 
  currentAdminName 
}: { 
  initialRequests: any[];
  currentAdminName: string;
}) {
  const [requests, setRequests] = useState<ResetRequest[]>(initialRequests);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // Modais
  const [activeHistory, setActiveHistory] = useState<any[] | null>(null);
  const [historyProtocol, setHistoryProtocol] = useState("");
  const [directResetReq, setDirectResetReq] = useState<ResetRequest | null>(null);
  const [newDirectPassword, setNewDirectPassword] = useState("");
  const [directResetNotes, setDirectResetNotes] = useState("");
  const [generatedLinkInfo, setGeneratedLinkInfo] = useState<{ url: string; protocol: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/password-resets");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error("Erro ao atualizar lista:", e);
    }
  };

  const handleAction = async (id: string, action: string, extraBody: any = {}) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/password-resets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...extraBody }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Falha ao executar ação administrativa.");
        return;
      }

      if (action === "GENERATE_LINK" && data.resetUrl) {
        setGeneratedLinkInfo({
          url: data.resetUrl,
          protocol: data.request.protocol,
        });
      }

      await fetchRequests();
    } catch (e) {
      alert("Erro ao conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directResetReq) return;

    if (newDirectPassword.length < 6) {
      alert("A nova senha deve possuir no mínimo 6 caracteres.");
      return;
    }

    await handleAction(directResetReq.id, "DIRECT_RESET", {
      newPassword: newDirectPassword,
      notes: directResetNotes,
    });

    setDirectResetReq(null);
    setNewDirectPassword("");
    setDirectResetNotes("");
  };

  // Filtragem
  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    if (!matchesStatus) return false;

    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.protocol.toLowerCase().includes(term) ||
      r.user_name.toLowerCase().includes(term) ||
      r.username.toLowerCase().includes(term) ||
      r.user_email.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Pendente
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Em Atendimento
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Concluída
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Cancelada
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Controles: Busca e Filtros */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Barra de Busca */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por protocolo, nome, login..."
            className="w-full bg-background border border-border text-foreground text-xs rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
          />
        </div>

        {/* Abas de Status */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {[
            { id: "ALL", label: "Todas" },
            { id: "PENDING", label: "Pendentes" },
            { id: "IN_PROGRESS", label: "Em Atendimento" },
            { id: "RESOLVED", label: "Concluídas" },
            { id: "CANCELLED", label: "Canceladas" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === tab.id 
                  ? "bg-primary text-white shadow-sm" 
                  : "bg-background text-muted-foreground hover:bg-surface-hover hover:text-foreground border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Tabela de Solicitações */}
      <div className="bg-surface shadow-sm border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-hover/60">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Protocolo / Data</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Solicitante</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Identificação</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Responsável</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações Administrativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm font-medium">
                    Nenhuma solicitação de recuperação encontrada.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-hover/40 transition-colors">
                    
                    {/* Protocolo / Data */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-primary">{req.protocol}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(req.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Solicitante */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>{req.user_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {req.user?.job_title ? `${req.user.job_title} • ` : ""}
                        {req.user?.department?.name || "Sem setor"}
                      </div>
                    </td>

                    {/* Identificação */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs text-foreground font-medium">Login: <strong>{req.username}</strong></div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[220px]">
                        {req.user_email || "E-mail não informado"}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>

                    {/* Responsável */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-foreground">
                      {req.admin_name ? (
                        <span className="font-semibold">{req.admin_name}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Não atribuído</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Se Pendente: Botão para Assumir */}
                        {req.status === "PENDING" && (
                          <button
                            onClick={() => handleAction(req.id, "ASSIGN")}
                            disabled={loading}
                            title="Assumir chamado"
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
                          >
                            Atender
                          </button>
                        )}

                        {/* Se Pendente ou Em Atendimento: Opções de Resolução */}
                        {(req.status === "PENDING" || req.status === "IN_PROGRESS") && (
                          <>
                            {/* Gerar Link Seguro */}
                            <button
                              onClick={() => handleAction(req.id, "GENERATE_LINK")}
                              disabled={loading}
                              title="Gerar link de redefinição único"
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors"
                            >
                              Gerar Link
                            </button>

                            {/* Redefinir Diretamente */}
                            <button
                              onClick={() => setDirectResetReq(req)}
                              disabled={loading}
                              title="Definir nova senha provisória"
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                            >
                              Nova Senha
                            </button>

                            {/* Cancelar */}
                            <button
                              onClick={() => {
                                const reason = prompt("Motivo do cancelamento (opcional):");
                                if (reason !== null) {
                                  handleAction(req.id, "CANCEL", { notes: reason });
                                }
                              }}
                              disabled={loading}
                              title="Cancelar solicitação"
                              className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                            >
                              Cancelar
                            </button>
                          </>
                        )}

                        {/* Histórico de Auditoria */}
                        <button
                          onClick={() => {
                            let historyArr = [];
                            try {
                              historyArr = JSON.parse(req.history || "[]");
                            } catch (e) {
                              historyArr = [];
                            }
                            setActiveHistory(historyArr);
                            setHistoryProtocol(req.protocol);
                          }}
                          title="Ver histórico de auditoria"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-border transition-colors"
                        >
                          <History className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Link Seguro Gerado */}
      {generatedLinkInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface p-6 rounded-2xl border border-border shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-foreground">Link de Redefinição Gerado</h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{generatedLinkInfo.protocol}</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Um token seguro de uso único foi gerado com expiração de 60 minutos. A notificação com o link foi disparada para o e-mail cadastrado do usuário. Você também pode copiar o link diretamente abaixo caso deseje enviar por outro canal corporativo:
            </p>

            <div className="p-3 bg-background border border-border rounded-xl flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLinkInfo.url}
                className="w-full bg-transparent text-xs text-foreground font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(generatedLinkInfo.url)}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover flex items-center gap-1.5 flex-shrink-0 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setGeneratedLinkInfo(null)}
                className="px-5 py-2.5 rounded-xl bg-surface-hover text-foreground text-xs font-semibold hover:bg-surface border border-border transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Redefinição Direta Segura */}
      {directResetReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface p-6 rounded-2xl border border-border shadow-2xl space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Definir Nova Senha</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Usuário: <strong>{directResetReq.user_name}</strong> ({directResetReq.username})
              </p>
            </div>

            <form onSubmit={handleDirectResetSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nova Senha Provisória</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={newDirectPassword}
                    onChange={(e) => setNewDirectPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-background border border-border text-foreground text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Observação Administrativa (Audit)</label>
                <textarea
                  value={directResetNotes}
                  onChange={(e) => setDirectResetNotes(e.target.value)}
                  placeholder="Ex: Senha provisória informada via WhatsApp corporativo."
                  rows={2}
                  className="w-full bg-background border border-border text-foreground text-xs rounded-xl p-3 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDirectResetReq(null)}
                  className="px-4 py-2 rounded-xl bg-surface-hover text-foreground text-xs font-semibold hover:bg-surface border border-border transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || newDirectPassword.length < 6}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Histórico de Auditoria */}
      {activeHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface p-6 rounded-2xl border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Histórico de Auditoria</h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{historyProtocol}</span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {activeHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum evento registrado.</p>
              ) : (
                activeHistory.map((item, idx) => (
                  <div key={idx} className="p-3 bg-background border border-border rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-primary">{item.action}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.date).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-xs text-foreground font-medium">Por: {item.actor}</div>
                    {item.notes && (
                      <p className="text-[11px] text-muted-foreground italic mt-0.5">{item.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveHistory(null)}
                className="px-5 py-2.5 rounded-xl bg-surface-hover text-foreground text-xs font-semibold hover:bg-surface border border-border transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
