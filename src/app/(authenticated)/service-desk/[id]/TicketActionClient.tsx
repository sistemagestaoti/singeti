"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Edit2 } from "lucide-react";

export default function TicketActionClient({ ticketId, currentStatus }: { ticketId: string, currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: string, actionName: string) => {
    if (!confirm(\`Deseja realmente \${actionName} este chamado?\`)) return;
    setLoading(true);
    try {
      const res = await fetch(\`/api/tickets/\${ticketId}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, content: \`Chamado alterado para: \${newStatus}\`, is_internal: true })
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Erro ao executar ação.");
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este chamado?")) return;
    setLoading(true);
    try {
      // Create DELETE route for tickets if not exists, or we use standard API
      const res = await fetch(\`/api/tickets/\${ticketId}\`, { method: "DELETE" });
      if (res.ok) {
        router.push('/service-desk');
        router.refresh();
      } else {
        alert("Erro ao excluir.");
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap mt-4 sm:mt-0">
      {currentStatus !== 'RESOLVED' && currentStatus !== 'CLOSED' && (
        <button 
          onClick={() => handleStatusChange('RESOLVED', 'Resolver')} 
          disabled={loading}
          className="bg-success/10 text-success border border-success/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-success/20 transition-colors"
        >
          <Check className="w-4 h-4" /> Resolver Chamado
        </button>
      )}
      {currentStatus !== 'CLOSED' && (
        <button 
          onClick={() => handleStatusChange('CLOSED', 'Encerrar')} 
          disabled={loading}
          className="bg-muted text-foreground border border-border px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-surface-hover transition-colors"
        >
          <X className="w-4 h-4" /> Fechar Chamado
        </button>
      )}
      <button 
        onClick={handleDelete} 
        disabled={loading}
        className="bg-danger/10 text-danger border border-danger/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-danger/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" /> Excluir
      </button>
    </div>
  );
}
