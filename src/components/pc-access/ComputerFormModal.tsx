"use client";

import { useState, useEffect } from "react";
import { X, Monitor, Server, Laptop, Cpu, HardDrive, Wifi, Building, User, FileText, Check } from "lucide-react";

interface ComputerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any | null; // Se fornecido, modo de edição
}

export function ComputerFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ComputerFormModalProps) {
  const isEditing = !!initialData;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auxiliares
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Formulário
  const [formData, setFormData] = useState({
    name: "",
    asset_tag: "",
    hostname: "",
    device_type: "DESKTOP",
    manufacturer: "",
    model: "",
    serial_number: "",
    os_name: "Windows 11 Pro",
    os_version: "23H2",
    processor: "",
    memory_mb: "16384",
    storage_gb: "512",
    ip_address: "",
    mac_address: "",
    domain_workgroup: "WORKGROUP",
    physical_location: "",
    department_id: "",
    location_id: "",
    status: "IN_USE",
    primary_collaborator_id: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      // Carrega departamentos, unidades e colaboradores
      Promise.all([
        fetch("/api/departments").then((r) => r.json()).catch(() => []),
        fetch("/api/locations").then((r) => r.json()).catch(() => []),
        fetch("/api/pc-access/collaborators").then((r) => r.json()).catch(() => ({ items: [] })),
      ]).then(([deps, locs, collabs]) => {
        setDepartments(Array.isArray(deps) ? deps : []);
        setLocations(Array.isArray(locs) ? locs : []);
        setCollaborators(collabs.items || []);
      });

      if (initialData) {
        setFormData({
          name: initialData.name || "",
          asset_tag: initialData.asset_tag || "",
          hostname: initialData.hostname || "",
          device_type: initialData.device_type || "DESKTOP",
          manufacturer: initialData.manufacturer || "",
          model: initialData.model || "",
          serial_number: initialData.serial_number || "",
          os_name: initialData.os_name || "Windows 11 Pro",
          os_version: initialData.os_version || "23H2",
          processor: initialData.processor || "",
          memory_mb: initialData.memory_mb ? String(initialData.memory_mb) : "16384",
          storage_gb: initialData.storage_gb ? String(initialData.storage_gb) : "512",
          ip_address: initialData.ip_address || "",
          mac_address: initialData.mac_address || "",
          domain_workgroup: initialData.domain_workgroup || "WORKGROUP",
          physical_location: initialData.physical_location || "",
          department_id: initialData.department?.id || initialData.department_id || "",
          location_id: initialData.location?.id || initialData.location_id || "",
          status: initialData.status || "IN_USE",
          primary_collaborator_id: initialData.primary_user?.id || "",
          notes: initialData.notes || "",
        });
      } else {
        setFormData({
          name: "",
          asset_tag: "",
          hostname: "",
          device_type: "DESKTOP",
          manufacturer: "",
          model: "",
          serial_number: "",
          os_name: "Windows 11 Pro",
          os_version: "23H2",
          processor: "",
          memory_mb: "16384",
          storage_gb: "512",
          ip_address: "",
          mac_address: "",
          domain_workgroup: "WORKGROUP",
          physical_location: "",
          department_id: "",
          location_id: "",
          status: "IN_USE",
          primary_collaborator_id: "",
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
      const url = isEditing
        ? `/api/pc-access/computers/${initialData.id}`
        : `/api/pc-access/computers`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar computador");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isEditing ? "Editar Computador" : "Novo Computador"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Cadastro técnico do equipamento e configurações de acesso
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

        {/* Form Body com scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {error}
            </div>
          )}

          {/* Seção 1: Identificação */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
              <Monitor className="w-4 h-4 text-primary" /> Identificação do Equipamento
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nome do Computador *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: PC-FINANCEIRO-01"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Patrimônio (Asset Tag)
                </label>
                <input
                  type="text"
                  value={formData.asset_tag}
                  onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                  placeholder="Ex: PAT-0142"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Hostname na Rede
                </label>
                <input
                  type="text"
                  value={formData.hostname}
                  onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                  placeholder="Ex: WS-FIN-01"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tipo de Equipamento
                </label>
                <select
                  value={formData.device_type}
                  onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  <option value="DESKTOP">Desktop / Torre</option>
                  <option value="NOTEBOOK">Notebook / Portátil</option>
                  <option value="MINI_PC">Mini PC / Thin Client</option>
                  <option value="ALL_IN_ONE">All-in-One</option>
                  <option value="SERVER">Servidor Físico</option>
                  <option value="OUTRO">Outro Equipamento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Situação Operacional
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
                >
                  <option value="IN_USE">Em Uso</option>
                  <option value="AVAILABLE">Disponível</option>
                  <option value="MAINTENANCE">Em Manutenção</option>
                  <option value="SPARE">Reserva Operacional</option>
                  <option value="DECOMMISSIONED">Desativado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Fabricante
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Ex: Dell, Lenovo, HP"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Modelo
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: OptiPlex 7090"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Número de Série (S/N)
                </label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Ex: 8H7B9K2"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Hardware & Sistema Operacional */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
              <Cpu className="w-4 h-4 text-primary" /> Configuração Técnica & SO
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Sistema Operacional
                </label>
                <input
                  type="text"
                  value={formData.os_name}
                  onChange={(e) => setFormData({ ...formData, os_name: e.target.value })}
                  placeholder="Ex: Windows 11 Pro, Windows 10 Pro"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Versão / Build
                </label>
                <input
                  type="text"
                  value={formData.os_version}
                  onChange={(e) => setFormData({ ...formData, os_version: e.target.value })}
                  placeholder="Ex: 23H2"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Processador (CPU)
                </label>
                <input
                  type="text"
                  value={formData.processor}
                  onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                  placeholder="Ex: Intel i5-12400"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Memória RAM (MB)
                </label>
                <select
                  value={formData.memory_mb}
                  onChange={(e) => setFormData({ ...formData, memory_mb: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  <option value="4096">4 GB (4096 MB)</option>
                  <option value="8192">8 GB (8192 MB)</option>
                  <option value="16384">16 GB (16384 MB)</option>
                  <option value="32768">32 GB (32768 MB)</option>
                  <option value="65536">64 GB (65536 MB)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Armazenamento (GB)
                </label>
                <select
                  value={formData.storage_gb}
                  onChange={(e) => setFormData({ ...formData, storage_gb: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  <option value="128">128 GB SSD</option>
                  <option value="256">256 GB SSD</option>
                  <option value="512">512 GB SSD</option>
                  <option value="1024">1 TB (1024 GB)</option>
                  <option value="2048">2 TB (2048 GB)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Endereço IP
                </label>
                <input
                  type="text"
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  placeholder="Ex: 192.168.1.45"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Endereço MAC
                </label>
                <input
                  type="text"
                  value={formData.mac_address}
                  onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                  placeholder="Ex: 00:1B:44:11:3A:B7"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Domínio ou Workgroup
                </label>
                <input
                  type="text"
                  value={formData.domain_workgroup}
                  onChange={(e) => setFormData({ ...formData, domain_workgroup: e.target.value })}
                  placeholder="Ex: CORP.EMPRESA.LOCAL, AzureAD ou WORKGROUP"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Localização & Vínculo com Usuário */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
              <Building className="w-4 h-4 text-primary" /> Localização & Responsável
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Unidade
                </label>
                <select
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  <option value="">Selecione a Unidade...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Setor / Departamento
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  <option value="">Selecione o Setor...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Local Físico Específico
                </label>
                <input
                  type="text"
                  value={formData.physical_location}
                  onChange={(e) => setFormData({ ...formData, physical_location: e.target.value })}
                  placeholder="Ex: Sala 204, Bloco B, Recepção"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              {!isEditing && (
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Colaborador / Usuário Principal Inicial
                  </label>
                  <select
                    value={formData.primary_collaborator_id}
                    onChange={(e) => setFormData({ ...formData, primary_collaborator_id: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  >
                    <option value="">Nenhum (Equipamento em estoque/disponível)</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.job_title ? `— ${c.job_title}` : ""} {c.department_name ? `(${c.department_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Observações Técnicas / Histórico Inicial
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações internas sobre upgrades, licenças ou condições do equipamento..."
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-hover/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar Computador"}
          </button>
        </div>
      </div>
    </div>
  );
}
