"use client";

import { useState } from "react";
import { X, Share2, Search, Hash, Check } from "lucide-react";

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  messageType?: string;
  fileName?: string | null;
  fileSize?: number | null;
  channels: Array<{ id: string; name: string | null; is_group: boolean; members?: any[] }>;
  users: Array<{ id: string; name: string; avatar?: string | null; email: string }>;
  currentUser: { id: string; name: string };
  onForward: (targetChannelId: string) => Promise<void>;
}

export function ForwardModal({
  isOpen,
  onClose,
  messageContent,
  messageType = "text",
  fileName,
  fileSize,
  channels,
  users,
  currentUser,
  onForward,
}: ForwardModalProps) {
  const [search, setSearch] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const filteredChannels = channels.filter((c) => {
    if (c.is_group) {
      return (c.name || "Geral").toLowerCase().includes(search.toLowerCase());
    }
    const other = c.members?.find((m) => m.id !== currentUser.id);
    return (other?.name || "").toLowerCase().includes(search.toLowerCase());
  });

  const handleSend = async () => {
    if (!selectedChannelId) return;
    setSending(true);
    try {
      await onForward(selectedChannelId);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Encaminhar Mensagem</h3>
              <p className="text-[11px] text-muted-foreground">Selecione para qual conversa ou canal enviar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prévia da Mensagem a Encaminhar */}
        <div className="px-4 py-2.5 bg-background/60 border-b border-border text-xs text-muted-foreground truncate italic">
          Prévia: &quot;{messageType === "file" ? (fileName || "Arquivo") : messageType === "image" ? "Imagem" : messageContent.slice(0, 60)}&quot;
        </div>

        {/* Busca */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar canal ou contato..."
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Lista de Destinos */}
        <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredChannels.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhuma conversa encontrada.
            </div>
          ) : (
            filteredChannels.map((c) => {
              const isSelected = selectedChannelId === c.id;
              const title = c.is_group
                ? `# ${c.name || "Geral"}`
                : c.members?.find((m) => m.id !== currentUser.id)?.name || "Chat Direto";

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedChannelId(c.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-hover text-left transition-colors ${
                    isSelected ? "bg-primary/10 border border-primary/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center font-bold text-xs text-primary shrink-0">
                      {c.is_group ? <Hash className="w-4 h-4" /> : title.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate">{title}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 rounded-xl border border-border bg-surface text-foreground text-xs font-bold hover:bg-surface-hover"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !selectedChannelId}
            className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
          >
            {sending ? "Encaminhando..." : "Encaminhar"}
          </button>
        </div>

      </div>
    </div>
  );
}
