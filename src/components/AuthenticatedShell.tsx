"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { SessionGuard } from "@/components/SessionGuard";
import { ContextualHelpProvider } from "@/components/help/ContextualHelpContext";
import { ContextualHelpDrawer } from "@/components/help/ContextualHelpDrawer";
import { supabase } from "@/lib/supabaseClient";
import { soundManager } from "@/lib/sound";
import { MessageSquare, X } from "lucide-react";

interface MobileMenuContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  navigatingTo: string | null;
  startNavigation: (href: string) => void;
  chatUnreadCount: number;
}

const MobileMenuContext = createContext<MobileMenuContextType>({
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  toggleMobileMenu: () => {},
  closeMobileMenu: () => {},
  navigatingTo: null,
  startNavigation: () => {},
  chatUnreadCount: 0,
});

export const useMobileMenu = () => useContext(MobileMenuContext);

export function AuthenticatedShell({
  userName,
  userAvatar,
  initialBranding,
  children,
}: {
  userName: string;
  userAvatar: string | null;
  initialBranding: any;
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatToast, setChatToast] = useState<{
    id: string;
    senderName: string;
    content: string;
    channelId: string;
  } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const deliveredIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Fecha o menu móvel e conclui estado de transição ao finalizar a troca de rota
  useEffect(() => {
    setIsMobileOpen(false);
    setNavigatingTo(null);
    if (pathname?.startsWith("/connect")) {
      setChatToast(null);
    }
  }, [pathname]);

  // Monitoramento global de mensagens não lidas do CONNECT CHAT em todas as telas do ERP
  useEffect(() => {
    let disposed = false;

    const checkChatSync = async () => {
      if (disposed) return;
      // Quando o usuário já está no Connect Chat visível, o próprio ChatInterface gerencia o sync da tela ativa (evita requisições duplicadas)
      if (pathnameRef.current?.startsWith("/connect") && typeof document !== "undefined" && !document.hidden) {
        return;
      }
      try {
        const res = await fetch("/api/chat/sync", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (disposed) return;

        setChatUnreadCount(Number(data.totalUnread || 0));

        // Confirmação de ENTREGA (DELIVERED) mesmo quando o destinatário está em outro módulo do Syngeti
        const ids: string[] = (data.unreadIds || []).filter((id: string) => !deliveredIdsRef.current.has(id));
        if (ids.length > 0) {
          ids.forEach((id) => deliveredIdsRef.current.add(id));
          fetch("/api/chat/receipts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageIds: ids, status: "DELIVERED" }),
          }).catch(() => {});
        }

        // Se o usuário NÃO está dentro do módulo /connect, dispara notificação visual/sonora global
        const onConnectPage = pathnameRef.current?.startsWith("/connect");
        const latest = data.latestUnread;
        if (!latest || notifiedIdsRef.current.has(latest.id)) return;
        notifiedIdsRef.current.add(latest.id);

        if (onConnectPage && typeof document !== "undefined" && !document.hidden) return;

        // Respeita silenciamento por canal
        try {
          const muted: string[] = JSON.parse(localStorage.getItem("connect_chat_muted") || "[]");
          if (muted.includes(latest.channel_id)) return;
        } catch {}

        // Deduplicação entre múltiplas abas
        const lockKey = `connect_notified_${latest.id}`;
        try {
          if (localStorage.getItem(lockKey)) return;
          localStorage.setItem(lockKey, String(Date.now()));
        } catch {}

        const soundOn = localStorage.getItem("connect_chat_sound") !== "false";
        const desktopOn = localStorage.getItem("connect_chat_desktop") !== "false";
        const privacy = localStorage.getItem("connect_chat_privacy") === "true";

        if (soundOn) soundManager.playMessageReceived();

        const previewText =
          latest.type === "sticker"
            ? "✨ Figurinha"
            : latest.type === "gif"
              ? "🎬 GIF"
              : latest.type === "image"
                ? "📷 Imagem compartilhada"
                : latest.type === "video"
                  ? "🎥 Vídeo"
                  : latest.type === "audio"
                    ? "🎤 Mensagem de voz"
                    : latest.type === "file"
                      ? "📄 Arquivo anexado"
                      : latest.type === "ticket"
                        ? "🎫 Chamado compartilhado"
                        : String(latest.content || "").slice(0, 120);

        if (!onConnectPage) {
          setChatToast({
            id: latest.id,
            senderName: privacy ? "CONNECT CHAT" : (latest.sender?.name || "Colega"),
            content: privacy ? "Você recebeu uma nova mensagem" : previewText,
            channelId: latest.channel_id,
          });
        }

        if (desktopOn && typeof document !== "undefined" && document.hidden && "Notification" in window && Notification.permission === "granted") {
          const n = new Notification(privacy ? "CONNECT CHAT" : `Nova mensagem de ${latest.sender?.name || "Colega"}`, {
            body: privacy ? "Você recebeu uma nova mensagem no CONNECT CHAT" : previewText,
            tag: `connect-${latest.channel_id}`,
            icon: "/favicon.ico",
          });
          n.onclick = () => {
            window.focus();
            router.push("/connect");
            n.close();
          };
        }
      } catch {}
    };

    checkChatSync();
    const interval = setInterval(checkChatSync, 18000);

    const ch = supabase.channel("connect-chat-global-shell", { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "message" }, () => {
      checkChatSync();
    });
    ch.subscribe();

    return () => {
      disposed = true;
      clearInterval(interval);
      supabase.removeChannel(ch);
    };
  }, [router]);

  const toggleMobileMenu = () => setIsMobileOpen((prev) => !prev);
  const closeMobileMenu = () => setIsMobileOpen(false);
  const startNavigation = (href: string) => {
    if (href !== pathname) {
      setNavigatingTo(href);
    }
  };

  return (
    <ContextualHelpProvider>
      <MobileMenuContext.Provider value={{ isMobileOpen, setIsMobileOpen, toggleMobileMenu, closeMobileMenu, navigatingTo, startNavigation, chatUnreadCount }}>
        <div className="flex h-screen overflow-hidden bg-background">
          <SessionGuard />
          <ContextualHelpDrawer />

        {/* Toast Global de Nova Mensagem (quando o usuário está em outros módulos como Service Desk, CMDB, etc.) */}
        {chatToast && (
          <div className="fixed bottom-5 right-5 z-[9998] max-w-sm w-full bg-surface border border-primary/40 rounded-2xl shadow-2xl p-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <button
              type="button"
              onClick={() => {
                setChatToast(null);
                startNavigation("/connect");
                router.push("/connect");
              }}
              className="flex-1 min-w-0 text-left"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">CONNECT CHAT</span>
                <span className="text-[10px] text-muted-foreground">• Agora</span>
              </div>
              <p className="text-xs font-bold text-foreground truncate mt-0.5">{chatToast.senderName}</p>
              <p className="text-xs text-muted-foreground truncate">{chatToast.content}</p>
            </button>
            <button
              type="button"
              onClick={() => setChatToast(null)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover shrink-0"
              aria-label="Dispensar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Barra superior indicadora de transição suave de abas (feedback visual imediato de 0ms) */}
        {navigatingTo && (
          <div 
            className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-cyan-400 to-primary animate-pulse z-[9999]" 
            role="progressbar" 
            aria-label="Carregando aba" 
          />
        )}

        {/* Sidebar responsiva (drawer deslizante no mobile, fixa no desktop) */}
        <Sidebar initialBranding={initialBranding} />

        {/* Backdrop escurecido para fechar a sidebar no mobile ao clicar fora */}
        {isMobileOpen && (
          <div
            onClick={closeMobileMenu}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
            aria-label="Fechar menu lateral"
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar userName={userName} avatar={userAvatar} />
          {pathname?.startsWith("/connect") ? (
            <main className="flex-1 overflow-hidden p-0 sm:p-3 md:p-6 flex flex-col min-h-0">
              <div className="max-w-7xl mx-auto w-full h-full flex flex-col flex-1 min-h-0">
                {children}
              </div>
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8">
              <div className="max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>
          )}
        </div>
      </div>
    </MobileMenuContext.Provider>
  </ContextualHelpProvider>
);
}
