"use client";

import { useState } from "react";
import { Send, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function TicketActionClient({ ticketId, currentStatus }: { ticketId: string, currentStatus: string }) {
  const [comment, setComment] = useState("");
  const [statusAction, setStatusAction] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isResolved = currentStatus === 'RESOLVED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && statusAction === currentStatus) return;
    
    setIsLoading(true);

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: comment,
          status: statusAction 
        })
      });

      if (res.ok) {
        setComment("");
        router.refresh();
      } else {
        alert("Erro ao atualizar chamado.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isResolved) {
    return (
      <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium py-2">
        <CheckCircle className="w-5 h-5" />
        <span>Este chamado foi encerrado e não pode receber novas atualizações.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea 
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Escreva uma resposta ou atualização..."
        className="w-full px-4 py-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-[#020817] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
      ></textarea>
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Ação de Status:</label>
          <select 
            value={statusAction}
            onChange={(e) => setStatusAction(e.target.value)}
            className="px-3 py-1.5 border dark:border-slate-700 rounded-lg bg-white dark:bg-[#020817] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            <option value="OPEN">Manter Aberto</option>
            <option value="IN_PROGRESS">Colocar em Atendimento</option>
            <option value="RESOLVED">Marcar como Resolvido</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading || (!comment.trim() && statusAction === currentStatus)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Send className="w-4 h-4" />
          {isLoading ? 'Enviando...' : 'Atualizar Chamado'}
        </button>
      </div>
    </form>
  );
}
