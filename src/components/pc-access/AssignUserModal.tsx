"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Check, UserCheck, Shield } from "lucide-react";

interface AssignUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  computerId: string;
  computerName: string;
}

export function AssignUserModal({
  isOpen,
  onClose,
  onSuccess,
  computerId,
  computerName,
}: AssignUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  const [collaboratorId, setCollaboratorId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/pc-access/collaborators")
        .then((r) => r.json())
        .then((res) => setCollaborators(res.items || []))
        .catch(() => {});

      setCollaboratorId("");
      setIsPrimary(true);
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaboratorId) {
      setError("Selecione um colaborador para vincular.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pc-access/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          computer_id: computerId,
          collaborator_id: collaboratorId,
          is_primary: isPrimary,
          notes: notes.trim() || "Vínculo de utilização operacional",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao vincular usuário");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao vincular");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Vincular Colaborador</h3>
              <p className="text-xs text-muted-foreground">
                Equipamento: <strong className="text-foreground">{computerName}</strong>
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
              Selecione o Colaborador *
            </label>
            <select
              required
              value={collaboratorId}
              onChange={(e) => setCollaboratorId(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="">Selecione na lista de colaboradores...</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.job_title ? `— ${c.job_title}` : ""} {c.department_name ? `(${c.department_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-hover border border-border flex items-center gap-3">
            <input
              type="checkbox"
              id="is_primary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
            />
            <label htmlFor="is_primary" className="text-xs text-foreground cursor-pointer select-none">
              <strong className="block font-semibold">Definir como Usuário Principal</strong>
              <span className="text-muted-foreground">
                O usuário principal é o responsável titular do equipamento.
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Motivo / Observações do Vínculo
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entrega de equipamento na admissão, termo assinado..."
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
              disabled={loading || !collaboratorId}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Vinculando..." : "Confirmar Vínculo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
