"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Monitor, Laptop, Server, HardDrive, Cpu, 
  Search, Filter, Plus, Upload, FileText, 
  RefreshCw, CheckCircle2, AlertTriangle, 
  Clock, Shield, Eye, Edit, ChevronRight, 
  Users, Key, Mail, ChevronLeft, Building, X,
  Trash2, Lock, History, ExternalLink, Globe, Check
} from "lucide-react";
import dynamic from "next/dynamic";
import { PCDetailsDrawer } from "./PCDetailsDrawer";

const ComputerFormModal = dynamic(() => import("./ComputerFormModal").then(m => m.ComputerFormModal), { ssr: false });
const CollaboratorFormModal = dynamic(() => import("./CollaboratorFormModal").then(m => m.CollaboratorFormModal), { ssr: false });
const EmailFormModal = dynamic(() => import("./EmailFormModal").then(m => m.EmailFormModal), { ssr: false });
const ImportInventoryModal = dynamic(() => import("./ImportInventoryModal").then(m => m.ImportInventoryModal), { ssr: false });
const ReportsModal = dynamic(() => import("./ReportsModal").then(m => m.ReportsModal), { ssr: false });
const VaultRevealModal = dynamic(() => import("./VaultRevealModal").then(m => m.VaultRevealModal), { ssr: false });

export function PCAccessClient() {
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");
  const tabParam = searchParams.get("tab");

  // Aba principal ativa: computadores, e-mails, colaboradores ou auditoria
  const [activeMainTab, setActiveMainTab] = useState<"computers" | "emails" | "collaborators" | "audit">(
    tabParam === "emails"
      ? "emails"
      : tabParam === "collaborators"
      ? "collaborators"
      : tabParam === "audit"
      ? "audit"
      : "computers"
  );

  // Sincroniza tabParam caso mude
  useEffect(() => {
    if (tabParam === "emails") setActiveMainTab("emails");
    else if (tabParam === "collaborators") setActiveMainTab("collaborators");
    else if (tabParam === "audit") setActiveMainTab("audit");
    else if (tabParam === "computers") setActiveMainTab("computers");
  }, [tabParam]);

  // -------------------------------------------------------------
  // ESTADO: COMPUTADORES
  // -------------------------------------------------------------
  const [computers, setComputers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    inUse: 0,
    available: 0,
    maintenance: 0,
    spare: 0,
    collaborators: 0,
    pendingReviews: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // -------------------------------------------------------------
  // ESTADO: CONTAS DE E-MAIL DOS DOMÍNIOS
  // -------------------------------------------------------------
  const [emails, setEmails] = useState<any[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailSearch, setEmailSearch] = useState("");
  const [debouncedEmailSearch, setDebouncedEmailSearch] = useState("");
  const [emailDomainFilter, setEmailDomainFilter] = useState("ALL");
  const [emailProviderFilter, setEmailProviderFilter] = useState("ALL");
  const [emailStatusFilter, setEmailStatusFilter] = useState("ALL");
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [emailPage, setEmailPage] = useState(1);
  const [emailLimit, setEmailLimit] = useState(20);
  const [emailTotalPages, setEmailTotalPages] = useState(1);
  const [emailTotalCount, setEmailTotalCount] = useState(0);

  // -------------------------------------------------------------
  // ESTADO: COLABORADORES & USUÁRIOS
  // -------------------------------------------------------------
  const [collaboratorsList, setCollaboratorsList] = useState<any[]>([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabSearch, setCollabSearch] = useState("");

  // -------------------------------------------------------------
  // ESTADO: AUDITORIA
  // -------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");

  // Auxiliares de filtro
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Modais
  const [isComputerModalOpen, setIsComputerModalOpen] = useState(false);
  const [editingComputer, setEditingComputer] = useState<any | null>(null);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<any | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<any | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [selectedPCId, setSelectedPCId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [vaultRevealTarget, setVaultRevealTarget] = useState<any | null>(null);

  // Abre automaticamente caso venha o parâmetro ?open=... da URL
  useEffect(() => {
    if (openParam) {
      setSelectedPCId(openParam);
      setIsDrawerOpen(true);
    }
  }, [openParam]);

  // Debounces
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmailSearch(emailSearch);
      setEmailPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [emailSearch]);

  // Carrega opções auxiliares
  useEffect(() => {
    Promise.all([
      fetch("/api/departments").then((r) => r.json()).catch(() => []),
      fetch("/api/locations").then((r) => r.json()).catch(() => []),
    ]).then(([deps, locs]) => {
      setDepartments(Array.isArray(deps) ? deps : []);
      setLocations(Array.isArray(locs) ? locs : []);
    });
  }, []);

  // Carrega métricas e KPIs
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/pc-access/stats");
      const json = await res.json();
      if (res.ok) setStats(json);
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Carrega listagem de computadores
  const loadComputers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (deviceTypeFilter !== "ALL") params.set("device_type", deviceTypeFilter);
      if (departmentFilter !== "ALL") params.set("department_id", departmentFilter);
      if (locationFilter !== "ALL") params.set("location_id", locationFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/pc-access/computers?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setComputers(json.items || []);
        setTotalPages(json.totalPages || 1);
        setTotalCount(json.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, deviceTypeFilter, departmentFilter, locationFilter, page, limit]);

  // Carrega listagem de e-mails corporativos dos domínios
  const loadEmails = useCallback(async () => {
    setEmailsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedEmailSearch) params.set("search", debouncedEmailSearch);
      if (emailDomainFilter !== "ALL") params.set("domain", emailDomainFilter);
      if (emailProviderFilter !== "ALL") params.set("provider", emailProviderFilter);
      if (emailStatusFilter !== "ALL") params.set("status", emailStatusFilter);
      params.set("page", String(emailPage));
      params.set("limit", String(emailLimit));

      const res = await fetch(`/api/pc-access/emails?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setEmails(json.items || []);
        setEmailTotalPages(json.totalPages || 1);
        setEmailTotalCount(json.total || 0);
        if (json.domains) setAvailableDomains(json.domains);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEmailsLoading(false);
    }
  }, [debouncedEmailSearch, emailDomainFilter, emailProviderFilter, emailStatusFilter, emailPage, emailLimit]);

  // Carrega colaboradores
  const loadCollaborators = useCallback(async () => {
    setCollabLoading(true);
    try {
      const params = new URLSearchParams();
      if (collabSearch) params.set("search", collabSearch);
      const res = await fetch(`/api/pc-access/collaborators?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setCollaboratorsList(json.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCollabLoading(false);
    }
  }, [collabSearch]);

  // Carrega logs de auditoria
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      if (auditActionFilter !== "ALL") params.set("action", auditActionFilter);
      const res = await fetch(`/api/pc-access/audit?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setAuditLogs(json.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  }, [auditActionFilter]);

  // Dispara carregamentos conforme aba
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeMainTab === "computers") {
      loadComputers();
    } else if (activeMainTab === "emails") {
      loadEmails();
    } else if (activeMainTab === "collaborators") {
      loadCollaborators();
    } else if (activeMainTab === "audit") {
      loadAuditLogs();
    }
  }, [activeMainTab, loadComputers, loadEmails, loadCollaborators, loadAuditLogs]);

  const handleOpenPC = (pcId: string) => {
    setSelectedPCId(pcId);
    setIsDrawerOpen(true);
  };

  const handleDeleteEmail = async (emailId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta de e-mail corporativo?")) return;
    try {
      const res = await fetch(`/api/pc-access/emails?id=${emailId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir e-mail");
      loadEmails();
      loadStats();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir");
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setDeviceTypeFilter("ALL");
    setDepartmentFilter("ALL");
    setLocationFilter("ALL");
    setPage(1);
  };

  const handleClearEmailFilters = () => {
    setEmailSearch("");
    setEmailDomainFilter("ALL");
    setEmailProviderFilter("ALL");
    setEmailStatusFilter("ALL");
    setEmailPage(1);
  };

  const hasActiveFilters =
    debouncedSearch !== "" ||
    statusFilter !== "ALL" ||
    deviceTypeFilter !== "ALL" ||
    departmentFilter !== "ALL" ||
    locationFilter !== "ALL";

  const hasActiveEmailFilters =
    debouncedEmailSearch !== "" ||
    emailDomainFilter !== "ALL" ||
    emailProviderFilter !== "ALL" ||
    emailStatusFilter !== "ALL";

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            {activeMainTab === "emails" ? (
              <Mail className="w-5 h-5" />
            ) : activeMainTab === "collaborators" ? (
              <Users className="w-5 h-5" />
            ) : activeMainTab === "audit" ? (
              <History className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">
              {activeMainTab === "emails"
                ? "Contas de E-mail dos Domínios"
                : activeMainTab === "collaborators"
                ? "Colaboradores & Usuários"
                : activeMainTab === "audit"
                ? "Trilha de Auditoria & Cofre"
                : "Gestão de Acessos a PCs"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeMainTab === "emails"
                ? "Cadastro e controle de e-mails corporativos, domínios, usuário titular e senhas no cofre"
                : activeMainTab === "collaborators"
                ? "Pessoas e colaboradores com vínculos em computadores e contas corporativas"
                : activeMainTab === "audit"
                ? "Histórico imutável de visualização de credenciais, modificações e acessos"
                : "Controle de computadores, configurações de hardware, contas locais e domínio"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {activeMainTab === "emails" ? (
            <button
              onClick={() => {
                setEditingEmail(null);
                setIsEmailModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Cadastrar Conta de E-mail
            </button>
          ) : activeMainTab === "collaborators" ? (
            <button
              onClick={() => {
                setEditingCollaborator(null);
                setIsCollaboratorModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Colaborador
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditingComputer(null);
                  setIsComputerModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Computador
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-blue-500" /> Importar
              </button>
            </>
          )}

          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" /> Relatórios
          </button>

          <button
            onClick={() => {
              loadStats();
              if (activeMainTab === "computers") loadComputers();
              else if (activeMainTab === "emails") loadEmails();
              else if (activeMainTab === "collaborators") loadCollaborators();
              else if (activeMainTab === "audit") loadAuditLogs();
            }}
            className="p-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shadow-xs ml-auto sm:ml-0"
            title="Recarregar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || emailsLoading || collabLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. BARRA DE SUB-ABAS SUPERIORES DESTAQUE */}
      <div className="bg-surface border border-border rounded-2xl p-1.5 shadow-2xs flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveMainTab("computers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeMainTab === "computers"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Computadores (PCs)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
            activeMainTab === "computers" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
          }`}>
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("emails")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeMainTab === "emails"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Contas de E-mail dos Domínios</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
            activeMainTab === "emails" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
          }`}>
            {emailTotalCount || emails.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("collaborators")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeMainTab === "collaborators"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Colaboradores & Usuários</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
            activeMainTab === "collaborators" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
          }`}>
            {stats.collaborators}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("audit")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeMainTab === "audit"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Trilha de Auditoria & Cofre</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: COMPUTADORES & PCs                                      */}
      {/* ============================================================== */}
      {activeMainTab === "computers" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Indicadores Compactos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Total de PCs</span>
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Monitor className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-foreground tracking-tight mt-1">
                {statsLoading ? "—" : stats.total}
              </div>
              <span className="text-[10px] text-muted-foreground">Parque cadastrado</span>
            </div>

            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Em Uso</span>
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-emerald-500 tracking-tight mt-1">
                {statsLoading ? "—" : stats.inUse}
              </div>
              <span className="text-[10px] text-muted-foreground">Ativos com usuário</span>
            </div>

            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Disponíveis</span>
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Monitor className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-blue-500 tracking-tight mt-1">
                {statsLoading ? "—" : stats.available}
              </div>
              <span className="text-[10px] text-muted-foreground">Prontos para alocação</span>
            </div>

            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Em Manutenção</span>
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-amber-500 tracking-tight mt-1">
                {statsLoading ? "—" : stats.maintenance}
              </div>
              <span className="text-[10px] text-muted-foreground">Oficina ou reparo</span>
            </div>

            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Colaboradores</span>
                <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-purple-500 tracking-tight mt-1">
                {statsLoading ? "—" : stats.collaborators}
              </div>
              <span className="text-[10px] text-muted-foreground">Usuários cadastrados</span>
            </div>

            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Revisão de Acesso</span>
                <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-rose-500 tracking-tight mt-1">
                {statsLoading ? "—" : stats.pendingReviews}
              </div>
              <span className="text-[10px] text-muted-foreground">Contas para auditar</span>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-surface p-3 rounded-2xl border border-border shadow-xs flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por computador, hostname, patrimônio, colaborador, IP, setor..."
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
            >
              <option value="ALL">Situação: Todas</option>
              <option value="IN_USE">Em Uso</option>
              <option value="AVAILABLE">Disponível</option>
              <option value="MAINTENANCE">Em Manutenção</option>
              <option value="SPARE">Reserva</option>
              <option value="DECOMMISSIONED">Desativado</option>
            </select>

            <select
              value={deviceTypeFilter}
              onChange={(e) => {
                setDeviceTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ALL">Tipo: Todos</option>
              <option value="DESKTOP">Desktop</option>
              <option value="NOTEBOOK">Notebook</option>
              <option value="MINI_PC">Mini PC</option>
              <option value="ALL_IN_ONE">All-in-One</option>
              <option value="SERVER">Servidor</option>
              <option value="OUTRO">Outro</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ALL">Setor: Todos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ALL">Unidade: Todas</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-1.5 rounded-xl bg-surface-hover border border-border text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>

          {/* Tabela de Computadores */}
          <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-xs">
                <thead className="bg-surface-hover/80 text-muted-foreground font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Código / Patr.</th>
                    <th className="px-4 py-3 whitespace-nowrap">Computador / Hostname</th>
                    <th className="px-4 py-3 whitespace-nowrap">Tipo</th>
                    <th className="px-4 py-3 whitespace-nowrap">Usuário Principal</th>
                    <th className="px-4 py-3 whitespace-nowrap">Setor & Unidade</th>
                    <th className="px-4 py-3 whitespace-nowrap">Rede (IP)</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Acessos / E-mails</th>
                    <th className="px-4 py-3 whitespace-nowrap">Situação</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-xs text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          <span>Carregando computadores...</span>
                        </div>
                      </td>
                    </tr>
                  ) : computers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-xs text-muted-foreground">
                        Nenhum computador encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    computers.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenPC(item.id)}
                        className="hover:bg-surface-hover/60 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                          <div className="font-bold text-foreground">{item.asset_tag || "S/N"}</div>
                          <div className="text-muted-foreground text-[10px]">{item.internal_id}</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-foreground text-xs group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {item.name}
                            {item.has_secrets && (
                              <span title="Possui credenciais salvas no cofre seguro">
                                <Shield className="w-3 h-3 text-amber-500 inline" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {item.hostname || "Sem hostname"}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                            {item.device_type === "NOTEBOOK" ? (
                              <Laptop className="w-3.5 h-3.5 text-blue-500" />
                            ) : item.device_type === "SERVER" ? (
                              <Server className="w-3.5 h-3.5 text-purple-500" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-primary" />
                            )}
                            {item.device_type}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.primary_user ? (
                            <div>
                              <div className="font-semibold text-foreground text-xs">
                                {item.primary_user.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                {item.primary_user.job_title || item.primary_user.email || "Colaborador"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">Sem responsável</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                          <div className="font-medium text-foreground">{item.department?.name || "N/A"}</div>
                          <div className="text-muted-foreground text-[10px]">{item.location?.name || "N/A"}</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          {item.ip_address || "DHCP / N/A"}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1.5 text-[11px]">
                            <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold border border-border">
                              {item.accounts_count} contas
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold border border-border">
                              {item.emails_count} emails
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              item.status === "IN_USE"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : item.status === "AVAILABLE"
                                ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                : item.status === "MAINTENANCE"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : item.status === "SPARE"
                                ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {item.status === "IN_USE"
                              ? "Em Uso"
                              : item.status === "AVAILABLE"
                              ? "Disponível"
                              : item.status === "MAINTENANCE"
                              ? "Em Manutenção"
                              : item.status === "SPARE"
                              ? "Reserva"
                              : "Desativado"}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenPC(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-semibold text-foreground hover:bg-surface-hover hover:text-primary transition-colors shadow-2xs"
                            >
                              Detalhes
                            </button>
                            <button
                              onClick={() => {
                                setEditingComputer(item);
                                setIsComputerModalOpen(true);
                              }}
                              className="p-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                              title="Editar cadastro"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="px-6 py-3 border-t border-border bg-surface-hover/30 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Mostrando <strong>{computers.length}</strong> de <strong>{totalCount}</strong> computadores
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: CONTAS DE E-MAIL DOS DOMÍNIOS (SOLICITADO PELO USUÁRIO) */}
      {/* ============================================================== */}
      {activeMainTab === "emails" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Indicadores de E-mails */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Contas de E-mail</span>
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-foreground tracking-tight mt-1">
                {emailsLoading ? "—" : emailTotalCount}
              </div>
              <span className="text-[10px] text-muted-foreground">E-mails cadastrados</span>
            </div>

            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Domínios Registrados</span>
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Globe className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-blue-500 tracking-tight mt-1">
                {availableDomains.length}
              </div>
              <span className="text-[10px] text-muted-foreground">Domínios corporativos</span>
            </div>

            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Senhas Custodiadas</span>
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Shield className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-amber-500 tracking-tight mt-1">
                {emails.filter((e) => e.has_secret).length}
              </div>
              <span className="text-[10px] text-muted-foreground">Protegidas no cofre AES-256</span>
            </div>

            <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">MFA Habilitado</span>
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-emerald-500 tracking-tight mt-1">
                {emails.filter((e) => e.mfa_enabled === "YES").length}
              </div>
              <span className="text-[10px] text-muted-foreground">Com duplo fator ativo</span>
            </div>
          </div>

          {/* Barra de Filtros de E-mails */}
          <div className="bg-surface p-3 rounded-2xl border border-border shadow-xs flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                placeholder="Pesquisar por endereço de e-mail, nome do titular ou colaborador..."
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
              />
              {emailSearch && (
                <button
                  onClick={() => setEmailSearch("")}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro de Domínio */}
            <select
              value={emailDomainFilter}
              onChange={(e) => {
                setEmailDomainFilter(e.target.value);
                setEmailPage(1);
              }}
              className="bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono"
            >
              <option value="ALL">Domínio: Todos</option>
              {availableDomains.map((dom) => (
                <option key={dom} value={dom}>
                  @{dom}
                </option>
              ))}
            </select>

            {/* Filtro de Provedor */}
            <select
              value={emailProviderFilter}
              onChange={(e) => {
                setEmailProviderFilter(e.target.value);
                setEmailPage(1);
              }}
              className="bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ALL">Provedor: Todos</option>
              <option value="M365">Microsoft 365</option>
              <option value="GOOGLE_WORKSPACE">Google Workspace</option>
              <option value="CORPORATE_IMAP">IMAP Corporativo</option>
              <option value="EXCHANGE">Exchange</option>
              <option value="OUTRO">Outro</option>
            </select>

            {/* Filtro de Status */}
            <select
              value={emailStatusFilter}
              onChange={(e) => {
                setEmailStatusFilter(e.target.value);
                setEmailPage(1);
              }}
              className="bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ALL">Status: Todos</option>
              <option value="ACTIVE">Ativo</option>
              <option value="SUSPENDED">Suspenso</option>
              <option value="DELETED">Desativado</option>
            </select>

            {hasActiveEmailFilters && (
              <button
                onClick={handleClearEmailFilters}
                className="px-2.5 py-1.5 rounded-xl bg-surface-hover border border-border text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Limpar
              </button>
            )}

            <button
              onClick={() => {
                setEditingEmail(null);
                setIsEmailModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 ml-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Novo E-mail
            </button>
          </div>

          {/* Tabela de Contas de E-mail */}
          <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-xs">
                <thead className="bg-surface-hover/80 text-muted-foreground font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Endereço de E-mail</th>
                    <th className="px-4 py-3 whitespace-nowrap">Domínio</th>
                    <th className="px-4 py-3 whitespace-nowrap">Usuário Titular / Colaborador</th>
                    <th className="px-4 py-3 whitespace-nowrap">Provedor & Tipo</th>
                    <th className="px-4 py-3 whitespace-nowrap">Senha (Cofre)</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">MFA</th>
                    <th className="px-4 py-3 whitespace-nowrap">Computador Vinculado</th>
                    <th className="px-4 py-3 whitespace-nowrap">Situação</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {emailsLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-xs text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          <span>Carregando contas de e-mail...</span>
                        </div>
                      </td>
                    </tr>
                  ) : emails.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-xs text-muted-foreground">
                        <div className="max-w-md mx-auto space-y-2">
                          <Mail className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
                          <p className="font-semibold text-foreground">Nenhuma conta de e-mail cadastrada.</p>
                          <p className="text-[11px]">
                            Clique no botão <strong>"Novo E-mail"</strong> acima para registrar contas dos domínios da empresa, suas senhas protegidas e os colaboradores responsáveis.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    emails.map((em) => (
                      <tr key={em.id} className="hover:bg-surface-hover/60 transition-colors group">
                        {/* E-mail */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-primary" />
                            <span>{em.email_address}</span>
                          </div>
                          {em.account_name && (
                            <div className="text-[10px] text-muted-foreground font-sans font-normal pl-5">
                              {em.account_name}
                            </div>
                          )}
                        </td>

                        {/* Domínio */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold border border-border">
                            @{em.domain}
                          </span>
                        </td>

                        {/* Usuário Titular */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {em.collaborator ? (
                            <div>
                              <div className="font-semibold text-foreground text-xs">
                                {em.collaborator.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {em.collaborator.job_title || em.collaborator.department_name || "Colaborador"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">
                              Não atribuído / Caixa Geral
                            </span>
                          )}
                        </td>

                        {/* Provedor & Tipo */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-foreground text-xs">{em.provider}</div>
                          <div className="text-[10px] text-muted-foreground">{em.account_type}</div>
                        </td>

                        {/* Senha Protegida */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {em.has_secret ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground tracking-widest font-bold">
                                ••••••••••••
                              </span>
                              <button
                                onClick={() =>
                                  setVaultRevealTarget({
                                    emailId: em.id,
                                    emailAddress: em.email_address,
                                  })
                                }
                                className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-bold border border-amber-500/20 transition-colors flex items-center gap-1 shadow-2xs"
                                title="Revelar senha temporariamente com confirmação"
                              >
                                <Eye className="w-3 h-3" /> Ver
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Sem senha salva
                            </span>
                          )}
                        </td>

                        {/* MFA */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              em.mfa_enabled === "YES"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {em.mfa_enabled === "YES" ? "Ativo" : "Não"}
                          </span>
                        </td>

                        {/* Computador Vinculado */}
                        <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                          {em.computer ? (
                            <button
                              onClick={() => handleOpenPC(em.computer.asset?.id || em.computer.id)}
                              className="text-primary hover:underline font-mono font-medium flex items-center gap-1"
                            >
                              <Monitor className="w-3 h-3" />
                              {em.computer.hostname || em.computer.asset?.name || "Computador"}
                            </button>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Nenhum</span>
                          )}
                        </td>

                        {/* Situação */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              em.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : em.status === "SUSPENDED"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {em.status === "ACTIVE" ? "Ativo" : em.status === "SUSPENDED" ? "Suspenso" : "Desativado"}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingEmail(em);
                                setIsEmailModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                              title="Editar e-mail / Alterar senha"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmail(em.id)}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Excluir conta de e-mail"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação de E-mails */}
            <div className="px-6 py-3 border-t border-border bg-surface-hover/30 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Total de <strong>{emailTotalCount}</strong> contas de e-mail registradas
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEmailPage((p) => Math.max(1, p - 1))}
                  disabled={emailPage <= 1 || emailsLoading}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-foreground">
                  {emailPage} / {emailTotalPages}
                </span>
                <button
                  onClick={() => setEmailPage((p) => Math.min(emailTotalPages, p + 1))}
                  disabled={emailPage >= emailTotalPages || emailsLoading}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: COLABORADORES & USUÁRIOS                                */}
      {/* ============================================================== */}
      {activeMainTab === "collaborators" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-surface p-3 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={collabSearch}
                onChange={(e) => setCollabSearch(e.target.value)}
                placeholder="Pesquisar colaborador por nome, cargo ou setor..."
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>

            <button
              onClick={() => {
                setEditingCollaborator(null);
                setIsCollaboratorModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Colaborador
            </button>
          </div>

          <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
            <table className="min-w-full divide-y divide-border text-left text-xs">
              <thead className="bg-surface-hover/80 text-muted-foreground font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Setor & Unidade</th>
                  <th className="px-4 py-3">E-mail Corporativo</th>
                  <th className="px-4 py-3">PCs Vinculados</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {collabLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-xs text-muted-foreground">
                      Carregando colaboradores...
                    </td>
                  </tr>
                ) : collaboratorsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-xs text-muted-foreground">
                      Nenhum colaborador cadastrado.
                    </td>
                  </tr>
                ) : (
                  collaboratorsList.map((collab) => (
                    <tr key={collab.id} className="hover:bg-surface-hover/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground">
                        {collab.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {collab.employee_code || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {collab.job_title || "Não informado"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{collab.department_name || "N/A"}</div>
                        <div className="text-[10px] text-muted-foreground">{collab.location_name || "N/A"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {collab.email || "Sem e-mail"}
                      </td>
                      <td className="px-4 py-3">
                        {collab.computers && collab.computers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {collab.computers.map((c: any) => (
                              <button
                                key={c.computer_id}
                                onClick={() => handleOpenPC(c.asset_id)}
                                className="px-2 py-0.5 rounded-md bg-muted hover:bg-surface-hover text-foreground font-mono text-[10px] border border-border"
                              >
                                {c.hostname || c.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Nenhum</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            collab.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {collab.status === "ACTIVE" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingCollaborator(collab);
                            setIsCollaboratorModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 4: TRILHA DE AUDITORIA & COFRE                             */}
      {/* ============================================================== */}
      {activeMainTab === "audit" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-surface p-3 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Filtrar por Operação:</label>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="ALL">Todas as Ações</option>
                <option value="VIEW_SECRET">Visualização de Segredo (Cofre)</option>
                <option value="CREATE_COMPUTER">Criação de Computador</option>
                <option value="UPDATE_COMPUTER">Atualização de Computador</option>
                <option value="CREATE_ACCOUNT">Criação de Conta</option>
                <option value="CREATE_EMAIL">Criação de E-mail</option>
                <option value="UPDATE_EMAIL">Atualização de E-mail</option>
                <option value="ASSIGN_USER">Vínculo de Usuário</option>
                <option value="IMPORT_INVENTORY">Importação em Lote</option>
                <option value="EXPORT_REPORT">Exportação de Relatório</option>
              </select>
            </div>

            <button
              onClick={loadAuditLogs}
              className="p-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shadow-xs"
              title="Recarregar logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
            <table className="min-w-full divide-y divide-border text-left text-xs">
              <thead className="bg-surface-hover/80 text-muted-foreground font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Data e Hora</th>
                  <th className="px-4 py-3">Ação Realizada</th>
                  <th className="px-4 py-3">Entidade / Alvo</th>
                  <th className="px-4 py-3">Usuário Executor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Detalhes Registrados</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {auditLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-xs text-muted-foreground">
                      Carregando trilha de auditoria...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-xs text-muted-foreground">
                      Nenhum registro de auditoria encontrado.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-hover/60 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-mono border border-border">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-foreground font-semibold">
                        {log.entity_name || log.entity_type}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <strong className="text-foreground">{log.user_name}</strong> {log.user_email ? `(${log.user_email})` : ""}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-[11px]">
                        {log.details || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER E MODAIS GLOBAIS                                        */}
      {/* ============================================================== */}
      <PCDetailsDrawer
        computerId={selectedPCId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedPCId(null);
        }}
        onRefreshList={() => {
          loadStats();
          loadComputers();
          loadEmails();
        }}
      />

      {isComputerModalOpen && (
        <ComputerFormModal
          isOpen={isComputerModalOpen}
          onClose={() => {
            setIsComputerModalOpen(false);
            setEditingComputer(null);
          }}
          onSuccess={() => {
            loadStats();
            loadComputers();
          }}
          initialData={editingComputer}
        />
      )}

      {isCollaboratorModalOpen && (
        <CollaboratorFormModal
          isOpen={isCollaboratorModalOpen}
          onClose={() => {
            setIsCollaboratorModalOpen(false);
            setEditingCollaborator(null);
          }}
          onSuccess={() => {
            loadStats();
            loadCollaborators();
          }}
          initialData={editingCollaborator}
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
            loadStats();
            loadEmails();
          }}
          initialData={editingEmail}
        />
      )}

      {isImportModalOpen && (
        <ImportInventoryModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            loadStats();
            loadComputers();
          }}
        />
      )}

      {isReportsModalOpen && (
        <ReportsModal
          isOpen={isReportsModalOpen}
          onClose={() => setIsReportsModalOpen(false)}
        />
      )}

      {/* Modal de Revelação de Senha no Cofre para E-mails */}
      {vaultRevealTarget && (
        <VaultRevealModal
          isOpen={!!vaultRevealTarget}
          onClose={() => setVaultRevealTarget(null)}
          emailId={vaultRevealTarget.emailId}
          accountUsername={vaultRevealTarget.emailAddress}
          computerName="Conta de E-mail Corporativo"
        />
      )}
    </div>
  );
}
