"use client";

import { useState, useEffect } from "react";
import { X, User, Mail, Phone, Briefcase, Building, FileText, Check } from "lucide-react";

interface CollaboratorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any | null;
}

export function CollaboratorFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CollaboratorFormModalProps) {
  const isEditing = !!initialData;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    employee_code: "",
    job_title: "",
    department_name: "",
    location_name: "",
    email: "",
    phone: "",
    status: "ACTIVE",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/departments").then((r) => r.json()).catch(() => []),
        fetch("/api/locations").then((r) => r.json()).catch(() => []),
      ]).then(([deps, locs]) => {
        setDepartments(Array.isArray(deps) ? deps : []);
        setLocations(Array.isArray(locs) ? locs : []);
      });

      if (initialData) {
        setFormData({
          name: initialData.name || "",
          employee_code: initialData.employee_code || "",
          job_title: initialData.job_title || "",
          department_name: initialData.department_name || "",
          location_name: initialData.location_name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          status: initialData.status || "ACTIVE",
          notes: initialData.notes || "",
        });
      } else {
        setFormData({
          name: "",
          employee_code: "",
          job_title: "",
          department_name: "",
          location_name: "",
          email: "",
          phone: "",
          status: "ACTIVE",
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
        ? `/api/pc-access/collaborators/${initialData.id}`
        : `/api/pc-access/collaborators`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar colaborador");
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
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isEditing ? "Editar Colaborador" : "Novo Colaborador"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Cadastro de usuário responsável e vínculo com equipamentos
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
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Maria Silva Pereira"
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Matrícula / Código
              </label>
              <input
                type="text"
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                placeholder="Ex: COL-0042"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Cargo / Função
              </label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="Ex: Analista Financeiro"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Setor / Departamento
              </label>
              <input
                type="text"
                list="dept-list"
                value={formData.department_name}
                onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                placeholder="Ex: Financeiro"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              <datalist id="dept-list">
                {departments.map((d) => (
                  <option key={d.id} value={d.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Unidade / Filial
              </label>
              <input
                type="text"
                list="loc-list"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                placeholder="Ex: Matriz"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              <datalist id="loc-list">
                {locations.map((l) => (
                  <option key={l.id} value={l.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                E-mail Corporativo
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: maria.silva@empresa.com.br"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Telefone / Ramal
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: (47) 99999-0000 / Ramal 204"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Situação do Vínculo
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
            >
              <option value="ACTIVE">Ativo na Empresa</option>
              <option value="INACTIVE">Desligado / Inativo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais de RH ou TI..."
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
              {loading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar Colaborador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
