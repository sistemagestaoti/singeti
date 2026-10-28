"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Monitor, Laptop, Server, HardDrive, Cpu, 
  Search, Filter, Plus, Upload, FileText, 
  RefreshCw, CheckCircle2, AlertTriangle, 
  Clock, Shield, Eye, Edit, ChevronRight, 
  Users, Key, Mail, ChevronLeft, Building, X 
} from "lucide-react";
import { ComputerFormModal } from "./ComputerFormModal";
import { CollaboratorFormModal } from "./CollaboratorFormModal";
import { ImportInventoryModal } from "./ImportInventoryModal";
import { ReportsModal } from "./ReportsModal";
import { PCDetailsDrawer } from "./PCDetailsDrawer";

export function PCAccessClient() {
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");

  // Dados principais
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

  // Filtros e paginação
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

  // Auxiliares de filtro
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Modais
  const [isComputerModalOpen, setIsComputerModalOpen] = useState(false);
  const [editingComputer, setEditingComputer] = useState<any | null>(null);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [selectedPCId, setSelectedPCId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Abre automaticamente caso venha o parâmetro ?open=... da URL (ex: redirecionado de um chamado)
  useEffect(() => {
    if (openParam) {
      setSelectedPCId(openParam);
      setIsDrawerOpen(true);
    }
  }, [openParam]);

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

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadComputers();
  }, [loadComputers]);

  const handleOpenPC = (pcId: string) => {
    setSelectedPCId(pcId);
    setIsDrawerOpen(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setDeviceTypeFilter("ALL");
    setDepartmentFilter("ALL");
    setLocationFilter("ALL");
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch !== "" ||
    statusFilter !== "ALL" ||
    deviceTypeFilter !== "ALL" ||
    departmentFilter !== "ALL" ||
    locationFilter !== "ALL";

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 1. Header Compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Gestão de Acessos a PCs
            </h1>
            <p className="text-xs text-muted-foreground">
              Controle de computadores, colaboradores, contas de domínio e credenciais seguras
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
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
            onClick={() => setIsCollaboratorModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-primary" /> Novo Colaborador
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500" /> Importar
          </button>

          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" /> Relatórios
          </button>

          <button
            onClick={() => {
              loadStats();
              loadComputers();
            }}
            className="p-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shadow-xs ml-auto sm:ml-0"
            title="Recarregar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Faixa Horizontal Compacta de Indicadores (6 KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Total PCs */}
        <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs hover:border-border transition-all">
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

        {/* Em Uso */}
        <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs hover:border-emerald-500/30 transition-all">
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

        {/* Disponíveis */}
        <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs hover:border-blue-500/30 transition-all">
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

        {/* Em Manutenção */}
        <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs hover:border-amber-500/30 transition-all">
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

        {/* Colaboradores Ativos */}
        <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs hover:border-purple-500/30 transition-all">
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

        {/* Revisões Pendentes */}
        <div className="bg-surface border border-border/80 rounded-xl p-3 shadow-2xs hover:border-rose-500/30 transition-all">
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

      {/* 3. Barra de Ferramentas de Filtros */}
      <div className="bg-surface p-3 rounded-2xl border border-border shadow-xs flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca Universal */}
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

          {/* Filtro de Situação */}
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

          {/* Filtro de Tipo */}
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

          {/* Filtro de Setor */}
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

          {/* Filtro de Unidade */}
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
              <X className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* 4. Tabela Principal de Computadores */}
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
                    {/* Código / Patrimônio */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                      <div className="font-bold text-foreground">{item.asset_tag || "S/N"}</div>
                      <div className="text-muted-foreground text-[10px]">{item.internal_id}</div>
                    </td>

                    {/* Computador / Hostname */}
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

                    {/* Tipo */}
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

                    {/* Usuário Principal */}
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
                        <span className="text-muted-foreground text-[11px] italic">
                          Sem responsável
                        </span>
                      )}
                    </td>

                    {/* Setor & Unidade */}
                    <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                      <div className="font-medium text-foreground">
                        {item.department?.name || "N/A"}
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {item.location?.name || "N/A"}
                      </div>
                    </td>

                    {/* Rede (IP) */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {item.ip_address || "DHCP / N/A"}
                    </td>

                    {/* Acessos / E-mails */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1.5 text-[11px]">
                        <span
                          className="px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold border border-border"
                          title="Contas de login cadastradas"
                        >
                          {item.accounts_count} contas
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold border border-border"
                          title="E-mails corporativos vinculados"
                        >
                          {item.emails_count} emails
                        </span>
                      </div>
                    </td>

                    {/* Situação */}
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

                    {/* Ações */}
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
              title="Página anterior"
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
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Ficha Completa do Equipamento (Drawer Lateral de 6 Abas) */}
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
        }}
      />

      {/* Modais da Gestão de Acessos */}
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
          onClose={() => setIsCollaboratorModalOpen(false)}
          onSuccess={() => {
            loadStats();
            loadComputers();
          }}
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
    </div>
  );
}
