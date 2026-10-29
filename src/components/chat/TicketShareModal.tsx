"use client";

import { useState, useEffect } from "react";
import { X, Search, HeadphonesIcon, Send, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

interface TicketItem {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  department?: { name: string } | null;
  assigned_to?: { name: string } | null;
}

interface TicketShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTicket: (ticket: TicketItem) => void;
}

export function TicketShareModal({ isOpen, onClose, onSelectTicket }: TicketShareModalProps) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("/api/tickets?limit=25")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setTickets(data);
          else if (Array.isArray(data?.items)) setTickets(data.items);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTickets = tickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.code?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q) ||
      t.department?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <HeadphonesIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Compartilhar Chamado no Chat</h3>
              <p className="text-[11px] text-muted-foreground">Selecione um chamado para enviar o card interativo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border bg-surface shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por código (ex: TICK-001) ou assunto..."
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Carregando chamados...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Nenhum chamado encontrado.</div>
          ) : (
            filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTicket(t);
                  onClose();
                }}
                className="p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-surface-hover/60 cursor-pointer transition-all flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-primary">{t.code}</span>
                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                      {t.department?.name ? `• ${t.department.name}` : ""}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {t.title}
                  </p>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold group-hover:bg-primary group-hover:text-white transition-all flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>Enviar</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
