"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TicketTimeline({ 
  ticketId, 
  comments, 
  currentUser,
  currentStatus 
}: { 
  ticketId: string, 
  comments: any[], 
  currentUser: any,
  currentStatus: string
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && status === currentStatus) return;
    
    setLoading(true);

    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          is_internal: isInternal,
          status: status
        })
      });

      setContent("");
      router.refresh();
    } catch (error) {
      alert("Erro ao adicionar nota.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface shadow-sm rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold text-foreground mb-6">Timeline do Chamado</h3>
        
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground pb-8">Nenhum comentário ou interação registrada ainda.</p>
            )}
            {comments.map((comment, commentIdx) => (
              <li key={comment.id}>
                <div className="relative pb-8">
                  {commentIdx !== comments.length - 1 ? (
                    <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                  ) : null}
                  <div className="relative flex items-start space-x-3">
                    <div className="relative">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-surface ${comment.is_internal ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'}`}>
                        <span className="font-bold text-sm">{comment.author.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 bg-surface-elevated p-4 rounded-xl border border-border">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-foreground">{comment.author.name}</span>
                          {comment.is_internal && <span className="ml-2 inline-flex items-center rounded-md bg-warning/10 px-2 py-1 text-xs font-bold text-warning border border-warning/20">Nota Interna</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground font-medium">
                          {new Date(comment.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                        {comment.content}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-surface shadow-sm rounded-xl border border-border p-6">
        <form onSubmit={handleSubmit}>
          <label htmlFor="comment" className="sr-only">Adicionar interação</label>
          <textarea
            id="comment"
            rows={4}
            className="block w-full rounded-md border-0 py-3 px-3 text-foreground ring-1 ring-inset ring-input placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            placeholder="Adicione um comentário, solução ou atualização do chamado..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-4 items-center flex-wrap">
              <label className="flex items-center text-sm font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2 rounded border-input text-primary focus:ring-primary"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                />
                Nota Interna (Visível apenas para TI)
              </label>

              <div className="flex items-center space-x-2 border-l border-border pl-4">
                <label className="text-sm font-bold text-muted-foreground">Mudar Status:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-md border-0 py-1.5 pl-3 pr-10 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-primary sm:text-sm font-semibold"
                >
                  <option value="NEW">Novo</option>
                  <option value="TRIAGE">Em Triagem</option>
                  <option value="ASSIGNED">Atribuído / Na Fila</option>
                  <option value="IN_PROGRESS">Em Atendimento</option>
                  <option value="WAITING_USER">Aguardando Usuário</option>
                  <option value="WAITING_SUPPLIER">Aguardando Fornecedor</option>
                  <option value="RESOLVED">Resolvido</option>
                  <option value="CLOSED">Fechado</option>
                </select>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Processando..." : "Registrar Ação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
