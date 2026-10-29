"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  User as UserIcon, Search, Hash, MessageSquare, Send, Circle, ArrowLeft,
  Smile, Heart, ThumbsUp, Sparkles, Star, Trash2, X, Image as ImageIcon, Flame, Check, CheckCheck, Loader2,
  Paperclip, Mic, MicOff, Video, Phone, PhoneOff, Pin, PinOff, Edit2, Share2, Download,
  FileText, Film, Volume2, Plus, Users, Shield, Play, Pause, CornerDownLeft, Eye,
  Settings, Wifi, WifiOff, RefreshCw, AlertCircle, Ticket, BellOff
} from "lucide-react";
import Image from "next/image";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { StickerCreatorModal } from "@/components/chat/StickerCreatorModal";
import { CallModal } from "@/components/chat/CallModal";
import { ForwardModal } from "@/components/chat/ForwardModal";
import { MediaLightbox } from "@/components/chat/MediaLightbox";
import { TicketShareModal } from "@/components/chat/TicketShareModal";
import { TicketShareCard } from "@/components/chat/TicketShareCard";
import { ChatSettingsModal } from "@/components/chat/ChatSettingsModal";
import { EmojiPickerPanel } from "@/components/chat/EmojiPickerPanel";
import { QUICK_REACTION_EMOJIS } from "@/lib/emojiCatalog";
import { soundManager } from "@/lib/sound";
import { supabase } from "@/lib/supabaseClient";

// Gera chave de idempotência única por tentativa lógica de envio
function newClientId() {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    return (crypto as any).randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mescla lista do servidor com mensagens locais pendentes, sem duplicar (por id e client_id)
function mergeMessages(server: Message[], local: Message[]): Message[] {
  const serverClientIds = new Set(server.map((m) => m.client_id).filter(Boolean) as string[]);
  const serverIds = new Set(server.map((m) => m.id));
  const pending = local.filter(
    (m) =>
      (m.status === "SENDING" || m.status === "FAILED") &&
      !serverIds.has(m.id) &&
      !(m.client_id && serverClientIds.has(m.client_id))
  );
  return [...server, ...pending];
}

// Assinatura leve para evitar re-render quando nada mudou
function messagesSignature(list: Message[]) {
  return list
    .map((m) => `${m.id}|${m.status || ""}|${m.is_edited ? 1 : 0}|${m.is_pinned ? 1 : 0}|${m.reactions?.length || 0}|${(m.receipts || []).map((r) => r.status).join("")}`)
    .join(",");
}

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  job_title?: string | null;
  status?: string | null;
  isOnline?: boolean;
  lastSeen?: number | null;
};

type ChannelMember = {
  id: string;
  name: string;
  avatar?: string | null;
  email?: string;
  job_title?: string | null;
};

type Channel = {
  id: string;
  name: string | null;
  description?: string | null;
  image?: string | null;
  is_group: boolean;
  admin_id?: string | null;
  members?: ChannelMember[];
};

type Reaction = {
  id: string;
  emoji: string;
  user_id: string;
  user: { id: string; name: string };
};

type Message = {
  id: string;
  content: string;
  type?: string; // "text" | "gif" | "sticker" | "image" | "video" | "audio" | "file"
  sender: { name: string; avatar?: string | null };
  created_at: string;
  sender_id: string;
  reactions?: Reaction[];
  is_pinned?: boolean;
  is_edited?: boolean;
  reply_to_id?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  metadata?: string | null;
  client_id?: string | null;
  // Estado local de envio: SENDING | SENT | FAILED (DELIVERED/READ derivados dos recibos)
  status?: string | null;
  receipts?: { user_id: string; status: string; updated_at?: string }[];
  _localPayload?: any;
};

type UserSticker = {
  id: string;
  url: string;
  name?: string | null;
  created_at: string;
};

type GifItem = {
  id: string;
  title: string;
  category: string;
  url: string;
  preview: string;
  tags: string[];
};

// Figurinhas padrão corporativas do sistema
const DEFAULT_SYSTEM_STICKERS = [
  {
    id: "def_1",
    name: "Aprovado",
    url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=80",
    badge: "APROVADO ✅"
  },
  {
    id: "def_2",
    name: "Chamado Resolvido",
    url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&auto=format&fit=crop&q=80",
    badge: "RESOLVIDO 🎯"
  },
  {
    id: "def_3",
    name: "Em Análise",
    url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=150&auto=format&fit=crop&q=80",
    badge: "EM ANÁLISE 🔍"
  },
  {
    id: "def_4",
    name: "Excelente Trabalho",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
    badge: "TOP! 🚀"
  },
  {
    id: "def_5",
    name: "Obrigado",
    url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=150&auto=format&fit=crop&q=80",
    badge: "OBRIGADO! 🙏"
  }
];

function UserAvatar({ name, url, className = "w-8 h-8" }: { name: string; url?: string | null; className?: string }) {
  if (url) {
    return (
      <div className={`${className} rounded-full overflow-hidden border border-border flex-shrink-0 bg-surface relative`}>
        <Image src={url} alt={name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className={`${className} rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0`}>
      {name ? name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
    </div>
  );
}

export default function ChatInterface({ 
  currentUser, 
  users: initialUsers, 
  channels: initialChannels,
  mainChannelId,
  departments = [],
}: { 
  currentUser: { id: string; name: string; avatar?: string | null };
  users: User[];
  channels: Channel[];
  mainChannelId: string;
  departments?: Array<{ id: string; name: string }>;
}) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [userList, setUserList] = useState<User[]>(initialUsers);
  const [activeChannelId, setActiveChannelId] = useState(mainChannelId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [creatingDM, setCreatingDM] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  // Modais de Recursos Corporativos
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isStickerCreatorOpen, setIsStickerCreatorOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState("");

  // Estados de Interação de Mensagens (Reply, Edit, Pin)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);

  // Estados para Gravação de Voz (Áudio)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estados para Upload de Arquivos
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para Mídia: Emojis, Figurinhas e GIFs
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTab, setMediaTab] = useState<'emojis' | 'stickers' | 'gifs'>('emojis');
  const [reactionTargetMessageId, setReactionTargetMessageId] = useState<string | null>(null);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(["😀", "👍", "❤️", "🚀", "✅", "🎉", "🙏", "☕"]);
  const [favoriteEmojis, setFavoriteEmojis] = useState<string[]>(["👍", "❤️", "✅", "🚀"]);
  const [emojiSkinTone, setEmojiSkinTone] = useState<string>("");
  const prefsSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cursorSelectionRef = useRef<{ start: number; end: number } | null>(null);
  
  // Figurinhas
  const [savedStickers, setSavedStickers] = useState<UserSticker[]>([]);
  const [loadingStickers, setLoadingStickers] = useState(false);
  
  // GIFs
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [gifSearch, setGifSearch] = useState("");
  const [gifCategory, setGifCategory] = useState("todos");
  const [loadingGifs, setLoadingGifs] = useState(false);
  
  // Feedback e Interação
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [brokenMediaIds, setBrokenMediaIds] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Confiabilidade / tempo real
  const [isTicketShareOpen, setIsTicketShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "realtime" | "polling" | "offline">("connecting");
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const [mutedChannels, setMutedChannels] = useState<string[]>([]);
  const activeChannelIdRef = useRef(activeChannelId);
  const messagesRef = useRef<Message[]>([]);
  const lastSignatureRef = useRef("");
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const deliveredIdsRef = useRef<Set<string>>(new Set());
  const realtimeChannelRef = useRef<any>(null);
  const fetchInFlightRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef(0);

  useEffect(() => { activeChannelIdRef.current = activeChannelId; }, [activeChannelId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("connect_chat_muted");
      if (raw) setMutedChannels(JSON.parse(raw));
    } catch {}
  }, []);

  const toggleMuteChannel = (channelId: string) => {
    setMutedChannels((prev) => {
      const next = prev.includes(channelId) ? prev.filter((c) => c !== channelId) : [...prev, channelId];
      try { localStorage.setItem("connect_chat_muted", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Exibe toast temporário
  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Carrega preferências de emojis do usuário (cache local + sincronização com Supabase)
  useEffect(() => {
    try {
      const localRecents = localStorage.getItem(`connect_emoji_recents_${currentUser.id}`);
      const localFavs = localStorage.getItem(`connect_emoji_favs_${currentUser.id}`);
      const localTone = localStorage.getItem(`connect_emoji_tone_${currentUser.id}`);
      if (localRecents) setRecentEmojis(JSON.parse(localRecents));
      if (localFavs) setFavoriteEmojis(JSON.parse(localFavs));
      if (localTone !== null) setEmojiSkinTone(localTone);
    } catch {}

    fetch("/api/chat/emoji-prefs")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.recentEmojis) && data.recentEmojis.length > 0) {
          setRecentEmojis(data.recentEmojis);
          try {
            localStorage.setItem(`connect_emoji_recents_${currentUser.id}`, JSON.stringify(data.recentEmojis));
          } catch {}
        }
        if (Array.isArray(data.favoriteEmojis) && data.favoriteEmojis.length > 0) {
          setFavoriteEmojis(data.favoriteEmojis);
          try {
            localStorage.setItem(`connect_emoji_favs_${currentUser.id}`, JSON.stringify(data.favoriteEmojis));
          } catch {}
        }
        if (typeof data.skinTone === "string") {
          setEmojiSkinTone(data.skinTone);
          try {
            localStorage.setItem(`connect_emoji_tone_${currentUser.id}`, data.skinTone);
          } catch {}
        }
      })
      .catch(() => {});
  }, [currentUser.id]);

  // Persiste preferências de emoji no Supabase com debounce para não gerar requisições a cada clique
  const scheduleEmojiPrefsSave = (nextRecents: string[], nextFavs: string[], nextTone: string) => {
    if (prefsSyncTimerRef.current) clearTimeout(prefsSyncTimerRef.current);
    prefsSyncTimerRef.current = setTimeout(() => {
      fetch("/api/chat/emoji-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentEmojis: nextRecents,
          favoriteEmojis: nextFavs,
          skinTone: nextTone,
        }),
      }).catch(() => {});
    }, 1200);
  };

  const recordRecentEmoji = (emoji: string) => {
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 28);
      try {
        localStorage.setItem(`connect_emoji_recents_${currentUser.id}`, JSON.stringify(next));
      } catch {}
      scheduleEmojiPrefsSave(next, favoriteEmojis, emojiSkinTone);
      return next;
    });
  };

  const handleToggleFavoriteEmoji = (emoji: string) => {
    setFavoriteEmojis((prev) => {
      const exists = prev.includes(emoji);
      const next = exists ? prev.filter((e) => e !== emoji) : [emoji, ...prev].slice(0, 48);
      try {
        localStorage.setItem(`connect_emoji_favs_${currentUser.id}`, JSON.stringify(next));
      } catch {}
      scheduleEmojiPrefsSave(recentEmojis, next, emojiSkinTone);
      return next;
    });
  };

  const handleChangeSkinTone = (tone: string) => {
    setEmojiSkinTone(tone);
    try {
      localStorage.setItem(`connect_emoji_tone_${currentUser.id}`, tone);
    } catch {}
    scheduleEmojiPrefsSave(recentEmojis, favoriteEmojis, tone);
  };

  // Fecha o picker ao clicar fora ou pressionar ESC
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMediaPicker(false);
        setReactionTargetMessageId(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowMediaPicker(false);
        setReactionTargetMessageId(null);
      }
    }
    if (showMediaPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMediaPicker]);

  useEffect(() => {
    setChannels(initialChannels);
  }, [initialChannels]);

  useEffect(() => {
    setUserList(initialUsers);
  }, [initialUsers]);

  // Carrega figurinhas salvas do usuário
  const fetchStickers = async () => {
    setLoadingStickers(true);
    try {
      const res = await fetch("/api/chat/stickers");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSavedStickers(data);
      }
    } catch (e) {
      console.error("Erro ao carregar figurinhas:", e);
    } finally {
      setLoadingStickers(false);
    }
  };

  useEffect(() => {
    fetchStickers();
  }, []);

  // Carrega GIFs animados
  const fetchGifs = async (query = "", category = "") => {
    setLoadingGifs(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category && category !== "todos") params.set("category", category);

      const res = await fetch(`/api/chat/gifs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setGifs(data);
      }
    } catch (e) {
      console.error("Erro ao buscar GIFs:", e);
    } finally {
      setLoadingGifs(false);
    }
  };

  useEffect(() => {
    if (mediaTab === 'gifs') {
      const timer = setTimeout(() => {
        fetchGifs(gifSearch, gifCategory);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [mediaTab, gifSearch, gifCategory]);

  // Polling e heartbeat de presença Online/Offline
  const fetchUsersAndPresence = async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch("/api/chat/users");
      if (res.ok) {
        const data = await res.json();
        if (data?.users && Array.isArray(data.users)) {
          setUserList(data.users);
        }
      }
    } catch (e) {}
  };

  const sendHeartbeatAndUpdatePresence = async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch("/api/chat/presence", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data?.presence) {
          setUserList(prevUsers => {
            return prevUsers.map(u => {
              const p = data.presence[u.id] || (u.email ? data.presence[`email:${u.email.toLowerCase()}`] : undefined);
              if (p) {
                return { ...u, isOnline: p.isOnline, lastSeen: p.lastSeen };
              }
              return { ...u, isOnline: false };
            });
          });
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchUsersAndPresence();
    const heartbeatInterval = setInterval(sendHeartbeatAndUpdatePresence, 7000);
    const usersInterval = setInterval(fetchUsersAndPresence, 60000);
    
    const handleVis = () => { 
      if (!document.hidden) {
        sendHeartbeatAndUpdatePresence(); 
      }
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(usersInterval);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, []);

  // Find active channel
  const activeChannel = useMemo(() => {
    return channels.find(c => c.id === activeChannelId);
  }, [channels, activeChannelId]);

  // Determine counterpart user if active channel is DM
  const activeDMUser = useMemo(() => {
    if (!activeChannel || activeChannel.is_group) return null;
    const otherMember = activeChannel.members?.find(m => m.id !== currentUser.id);
    if (otherMember) {
      const fullUser = userList.find(u => u.id === otherMember.id || (u.email && u.email === otherMember.email));
      return fullUser || otherMember;
    }
    return null;
  }, [activeChannel, currentUser.id, userList]);

  // Busca mensagens do canal ativo e reconcilia com mensagens locais pendentes (sem duplicar)
  const fetchMessages = async (force = false) => {
    const channelId = activeChannelIdRef.current;
    if (!channelId) return;
    if (!force && typeof document !== "undefined" && document.hidden) return;
    if (fetchInFlightRef.current === channelId) return; // deduplica requisições concorrentes do mesmo canal
    fetchInFlightRef.current = channelId;
    try {
      const res = await fetch(`/api/chat?channelId=${channelId}`, { cache: "no-store" });
      if (res.ok && channelId === activeChannelIdRef.current) {
        const data: Message[] = await res.json();
        const merged = mergeMessages(data, messagesRef.current);
        const sig = messagesSignature(merged);
        if (sig !== lastSignatureRef.current) {
          lastSignatureRef.current = sig;
          setMessages(merged);
        }
        setUnreadByChannel((prev) => (prev[channelId] ? { ...prev, [channelId]: 0 } : prev));
        // Emite confirmação em tempo real para o remetente atualizar os ticks de leitura (✓✓ azul)
        broadcastPing("receipt", channelId);
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    } finally {
      if (fetchInFlightRef.current === channelId) fetchInFlightRef.current = null;
    }
  };

  // Notificações (som + navegador) com deduplicação entre abas
  const notifyNewMessages = async () => {
    try {
      const res = await fetch("/api/chat/sync", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const byChannel: Record<string, number> = data.unreadByChannel || {};
      const byUser: Record<string, number> = data.unreadByUser || {};
      const activeId = activeChannelIdRef.current;
      const visibleActive = typeof document !== "undefined" && !document.hidden;
      if (visibleActive && activeId) byChannel[activeId] = 0;
      setUnreadByChannel(byChannel);
      setUnreadByUser(byUser);

      // Recibos de ENTREGA reais: o app do destinatário recebeu as mensagens
      const ids: string[] = (data.unreadIds || []).filter((id: string) => !deliveredIdsRef.current.has(id));
      if (ids.length > 0) {
        ids.forEach((id) => deliveredIdsRef.current.add(id));
        fetch("/api/chat/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: ids, status: "DELIVERED" }),
        })
          .then(() => {
            if (data.latestUnread?.channel_id) {
              broadcastPing("receipt", data.latestUnread.channel_id);
            }
          })
          .catch(() => {});
      }

      const latest = data.latestUnread;
      if (!latest || notifiedIdsRef.current.has(latest.id)) return;
      notifiedIdsRef.current.add(latest.id);

      // Não notifica se a conversa já está aberta e visível
      if (visibleActive && latest.channel_id === activeId) return;
      if (mutedChannels.includes(latest.channel_id)) return;

      // Coordenação entre múltiplas abas: apenas a primeira aba notifica
      const lockKey = `connect_notified_${latest.id}`;
      try {
        if (localStorage.getItem(lockKey)) return;
        localStorage.setItem(lockKey, String(Date.now()));
      } catch {}

      const soundOn = localStorage.getItem("connect_chat_sound") !== "false";
      const desktopOn = localStorage.getItem("connect_chat_desktop") !== "false";
      const privacy = localStorage.getItem("connect_chat_privacy") === "true";

      if (soundOn) soundManager.playMessageReceived();

      if (desktopOn && document.hidden && "Notification" in window && Notification.permission === "granted") {
        const previewBody =
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
                      : String(latest.content || "").slice(0, 140);

        const n = new Notification(privacy ? "CONNECT CHAT" : `Nova mensagem de ${latest.sender?.name || "colega"}`, {
          body: privacy ? "Nova mensagem no CONNECT CHAT" : previewBody,
          tag: `connect-${latest.channel_id}`,
          icon: "/favicon.ico",
        });
        n.onclick = () => {
          window.focus();
          setActiveChannelId(latest.channel_id);
          setMobileView("chat");
          n.close();
        };
      }
    } catch {}
  };

  // Ciclo de vida da assinatura Realtime (Broadcast sem conteúdo — apenas "ping" seguro)
  useEffect(() => {
    let disposed = false;
    let retry = 0;
    let retryTimer: any = null;

    const subscribe = () => {
      if (disposed) return;
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      setConnectionState((s) => (s === "offline" ? s : "connecting"));
      const ch = supabase.channel("connect-chat-events", { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "message" }, ({ payload }: any) => {
        if (!payload?.channelId) return;
        if (payload.channelId === activeChannelIdRef.current) fetchMessages(true);
        notifyNewMessages();
      });
      ch.on("broadcast", { event: "receipt" }, ({ payload }: any) => {
        if (payload?.channelId === activeChannelIdRef.current) fetchMessages(true);
      });
      ch.on("broadcast", { event: "reaction" }, ({ payload }: any) => {
        if (payload?.channelId === activeChannelIdRef.current) fetchMessages(true);
      });
      ch.subscribe((status: string) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          retry = 0;
          setConnectionState("realtime");
          // Reconciliação após (re)conexão: busca no banco o que foi perdido
          fetchMessages(true);
          notifyNewMessages();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionState(navigator.onLine ? "polling" : "offline");
          // Backoff exponencial com jitter, máximo 60s
          const delay = Math.min(60000, 1000 * Math.pow(2, retry)) + Math.random() * 1000;
          retry++;
          clearTimeout(retryTimer);
          retryTimer = setTimeout(subscribe, delay);
        }
      });
      realtimeChannelRef.current = ch;
    };

    subscribe();

    const handleOnline = () => { setConnectionState("connecting"); retry = 0; subscribe(); };
    const handleOffline = () => setConnectionState("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Publica "ping" de nova mensagem, recibo ou reação (sem conteúdo). O destinatário busca pela API autenticada.
  const broadcastPing = (event: "message" | "receipt" | "reaction", channelId: string, messageId?: string) => {
    try {
      realtimeChannelRef.current?.send({
        type: "broadcast",
        event,
        payload: { channelId, messageId, senderId: currentUser.id },
      });
    } catch {}
  };

  // Troca de conversa: limpa a lista e carrega imediatamente
  useEffect(() => {
    lastSignatureRef.current = "";
    lastMessageCountRef.current = 0;
    setMessages([]);
    messagesRef.current = [];
    fetchMessages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId]);

  // Polling de segurança adaptativo: lento com Realtime ativo, rápido sem ele
  useEffect(() => {
    const intervalMs = connectionState === "realtime" ? 15000 : 4000;
    const interval = setInterval(() => fetchMessages(), intervalMs);
    const notifyInterval = setInterval(() => notifyNewMessages(), connectionState === "realtime" ? 30000 : 8000);
    const handleVis = () => { if (!document.hidden) { fetchMessages(true); notifyNewMessages(); } };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      clearInterval(interval);
      clearInterval(notifyInterval);
      document.removeEventListener("visibilitychange", handleVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId, connectionState]);

  // Rola para o fim somente quando chega mensagem nova (não a cada polling)
  useEffect(() => {
    if (messages.length !== lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Envio confiável: idempotência por clientId + retentativas com backoff + estados
  const postChatMessage = async (payload: {
    content: string;
    type: string;
    fileName?: string;
    fileSize?: number;
    replyToId?: string | null;
    metadata?: any;
  }, existingClientId?: string) => {
    const channelId = activeChannelIdRef.current;
    if (!channelId) return;
    const clientId = existingClientId || newClientId();

    if (!existingClientId) {
      setMessages((prev) => [...prev, {
        id: `opt_${clientId}`,
        client_id: clientId,
        content: payload.content,
        type: payload.type,
        reply_to_id: payload.replyToId || null,
        file_name: payload.fileName || null,
        file_size: payload.fileSize || null,
        metadata: payload.metadata ? (typeof payload.metadata === "string" ? payload.metadata : JSON.stringify(payload.metadata)) : null,
        sender: { name: currentUser.name, avatar: currentUser.avatar },
        created_at: new Date().toISOString(),
        sender_id: currentUser.id,
        reactions: [],
        status: "SENDING",
        _localPayload: { ...payload, channelId },
      }]);
    } else {
      setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...m, status: "SENDING" } : m)));
    }

    const maxAttempts = 3;
    let lastErrorText = payload.type === "sticker"
      ? "Não foi possível enviar a figurinha. Tentar novamente."
      : "Falha ao enviar. Toque em 'Tentar novamente'.";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, channelId, clientId }),
        });

        // Falhas permanentes de validação/autorização: não repetir automaticamente
        if (
          res.status === 400 ||
          res.status === 401 ||
          res.status === 403 ||
          res.status === 404 ||
          res.status === 413 ||
          res.status === 415 ||
          res.status === 422
        ) {
          const errBody = await res.json().catch(() => ({}));
          if (errBody?.error) {
            lastErrorText = errBody.error;
          }
          break;
        }

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          if (errBody?.error) {
            lastErrorText = errBody.error;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const saved: Message = await res.json();
        setMessages((prev) => {
          const without = prev.filter((m) => m.client_id !== clientId && m.id !== saved.id);
          return [...without, { ...saved, status: "SENT" }];
        });
        broadcastPing("message", channelId, saved.id);
        return saved;
      } catch {
        if (!navigator.onLine) break;
        if (attempt < maxAttempts - 1) {
          await sleep(Math.min(6000, 700 * Math.pow(2, attempt)) + Math.random() * 250);
        }
      }
    }

    setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...m, status: "FAILED" } : m)));
    showToast(navigator.onLine ? lastErrorText : "Sem conexão. A mensagem ficou pendente.");
  };

  const retryFailedMessage = (msg: Message) => {
    if (!msg.client_id || !msg._localPayload) return;
    const { channelId, ...payload } = msg._localPayload;
    if (channelId !== activeChannelIdRef.current) return;
    postChatMessage(payload, msg.client_id);
  };

  // Reenvio automático das mensagens pendentes ao reconectar
  useEffect(() => {
    const handler = () => {
      messagesRef.current
        .filter((m) => m.status === "FAILED" && m.sender_id === currentUser.id)
        .forEach((m) => retryFailedMessage(m));
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Estado de entrega derivado de confirmações reais
  const getDeliveryState = (msg: Message): "SENDING" | "FAILED" | "SENT" | "DELIVERED" | "READ" => {
    if (msg.status === "SENDING") return "SENDING";
    if (msg.status === "FAILED") return "FAILED";
    const others = (msg.receipts || []).filter((r) => r.user_id !== currentUser.id);
    if (others.some((r) => r.status === "READ")) return "READ";
    if (others.some((r) => r.status === "DELIVERED")) return "DELIVERED";
    return "SENT";
  };

  // Filtered lists
  const filteredUsers = useMemo(() => {
    let list = userList;
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(u => 
        u.name.toLowerCase().includes(term) || 
        u.email.toLowerCase().includes(term) ||
        (u.job_title && u.job_title.toLowerCase().includes(term))
      );
    }
    return list;
  }, [userList, search]);

  const onlineCount = useMemo(() => {
    return userList.filter(u => u.isOnline).length;
  }, [userList]);

  const isTargetOnline = useMemo(() => {
    if (!activeDMUser) return false;
    const match = userList.find(u => u.id === activeDMUser.id || (u.email && u.email.toLowerCase() === activeDMUser.email?.toLowerCase()));
    return !!match?.isOnline;
  }, [activeDMUser, userList]);

  const groupChannels = useMemo(() => {
    return channels.filter(c => c.is_group);
  }, [channels]);

  // Mensagens filtradas (com busca interna ou fixadas)
  const displayedMessages = useMemo(() => {
    let list = messages;
    if (showPinnedOnly) {
      list = list.filter(m => m.is_pinned);
    }
    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase();
      list = list.filter(m => 
        m.content.toLowerCase().includes(q) || 
        m.sender.name.toLowerCase().includes(q) ||
        (m.file_name && m.file_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [messages, showPinnedOnly, chatSearchQuery]);

  const pinnedMessagesCount = useMemo(() => {
    return messages.filter(m => m.is_pinned).length;
  }, [messages]);

  // Handle clicking on a user in the Direct Messages list
  const handleSelectUser = async (targetUser: User) => {
    setMobileView('chat');
    const existing = channels.find(c => 
      !c.is_group && 
      c.members?.some(m => m.id === targetUser.id)
    );

    if (existing) {
      setActiveChannelId(existing.id);
      return;
    }

    setCreatingDM(true);
    try {
      const res = await fetch("/api/chat/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUser.id }),
      });

      if (res.ok) {
        const newChannel = await res.json();
        setChannels(prev => {
          if (prev.some(c => c.id === newChannel.id)) return prev;
          return [...prev, newChannel];
        });
        setActiveChannelId(newChannel.id);
      }
    } catch (e) {
      console.error("Falha ao abrir canal direto:", e);
    } finally {
      setCreatingDM(false);
    }
  };

  // Enviar mensagem de texto
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !activeChannelId) return;

    const currentInput = input;
    const currentReplyId = replyingTo?.id || null;
    setInput("");
    setReplyingTo(null);

    await postChatMessage({ content: currentInput, type: "text", replyToId: currentReplyId });
  };

  // Compartilhar chamado como card interativo
  const shareTicket = async (t: any) => {
    const meta = {
      ticketId: t.id,
      code: t.code,
      title: t.title,
      status: t.status,
      priority: t.priority,
      departmentName: t.department?.name || null,
      assignedToName: t.assigned_to?.name || t.assigned_to_name || null,
    };
    await postChatMessage({ content: `🎫 ${t.code} — ${t.title}`, type: "ticket", metadata: meta });
  };

  // Enviar Mídia Direta (Figurinha ou GIF)
  const sendMedia = async (url: string, type: "gif" | "sticker") => {
    if (!url || !activeChannelId) return;
    setShowMediaPicker(false);
    await postChatMessage({ content: url, type });
  };

  // Upload e envio de arquivos (Imagens, Vídeos, Documentos, Áudios)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error || "Erro no upload");
      }

      const data = await res.json();
      
      // Determina tipo da mensagem
      let msgType = "file";
      if (file.type.startsWith("image/")) msgType = "image";
      else if (file.type.startsWith("video/")) msgType = "video";
      else if (file.type.startsWith("audio/")) msgType = "audio";

      await postChatMessage({
        content: data.url,
        type: msgType,
        fileName: file.name,
        fileSize: file.size,
      });

      showToast("Arquivo compartilhado com sucesso!");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Falha ao enviar arquivo.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Gravação de Áudio / Mensagem de Voz
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUri = reader.result as string;
          try {
            await postChatMessage({
              content: dataUri,
              type: "audio",
              fileName: `audio-${Date.now()}.webm`,
              fileSize: audioBlob.size,
            });
            showToast("Mensagem de voz enviada!");
          } catch (e) {
            console.error(e);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast("Não foi possível acessar o microfone.");
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      showToast("Gravação de voz cancelada.");
    }
  };

  // Reações com persistência no Supabase + sincronização em tempo real
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    recordRecentEmoji(emoji);
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      const currentReactions = msg.reactions || [];
      const hasMyReaction = currentReactions.some(r => r.user_id === currentUser.id && r.emoji === emoji);

      let nextReactions: Reaction[];
      if (hasMyReaction) {
        nextReactions = currentReactions.filter(r => !(r.user_id === currentUser.id && r.emoji === emoji));
      } else {
        nextReactions = [
          ...currentReactions,
          {
            id: "opt_r_" + Date.now(),
            emoji,
            user_id: currentUser.id,
            user: { id: currentUser.id, name: currentUser.name }
          }
        ];
      }
      return { ...msg, reactions: nextReactions };
    }));

    try {
      const res = await fetch("/api/chat/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.reactions) {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, reactions: data.reactions } : msg
          ));
        }
        broadcastPing("reaction", activeChannelIdRef.current, messageId);
      } else {
        fetchMessages(true);
      }
    } catch (e) {
      console.error("Erro ao atualizar reação:", e);
      fetchMessages(true);
    }
  };

  // Fixar / Desafixar Mensagem
  const handleTogglePin = async (msg: Message) => {
    const nextPin = !msg.is_pinned;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: nextPin } : m));

    try {
      await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id, isPinned: nextPin })
      });
      showToast(nextPin ? "📌 Mensagem fixada no canal!" : "Mensagem desafixada.");
    } catch (e) {
      fetchMessages();
    }
  };

  // Edição de Mensagem
  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditInput(msg.content);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editInput.trim()) return;

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editInput.trim(), is_edited: true } : m));
    setEditingMessageId(null);

    try {
      await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId, content: editInput.trim() })
      });
      showToast("Mensagem atualizada.");
    } catch (e) {
      fetchMessages();
    }
  };

  // Exclusão de Mensagem
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Deseja realmente excluir esta mensagem?")) return;

    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      await fetch(`/api/chat?messageId=${msgId}`, { method: "DELETE" });
      showToast("Mensagem excluída.");
    } catch (e) {
      fetchMessages();
    }
  };

  // Encaminhar Mensagem
  const handleForwardMessage = async (targetChannelId: string) => {
    if (!forwardingMessage) return;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: targetChannelId,
          content: forwardingMessage.content,
          type: forwardingMessage.type || "text",
          fileName: forwardingMessage.file_name,
          fileSize: forwardingMessage.file_size,
          metadata: forwardingMessage.metadata,
          clientId: newClientId(),
        }),
      });
      if (!res.ok) throw new Error("Falha ao encaminhar");
      const saved = await res.json();
      broadcastPing("message", targetChannelId, saved?.id);
      showToast("Mensagem encaminhada com sucesso!");
    } catch (e) {
      console.error(e);
      showToast("Falha ao encaminhar mensagem.");
    }
  };

  // Salvar figurinha favorita (com compactação automática caso seja imagem grande em Base64)
  const handleSaveSticker = async (url: string, name?: string) => {
    try {
      let stickerPayloadUrl = url;

      if (url.startsWith("data:image/") && url.length > 90_000) {
        try {
          const img = new window.Image();
          img.src = url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          const canvas = document.createElement("canvas");
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, size, size);
            const scale = Math.min(size / img.width, size / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const drawX = (size - drawW) / 2;
            const drawY = (size - drawH) / 2;
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            const webpUri = canvas.toDataURL("image/webp", 0.82);
            stickerPayloadUrl = webpUri.startsWith("data:image/webp")
              ? webpUri
              : canvas.toDataURL("image/png");
          }
        } catch {}
      }

      const res = await fetch("/api/chat/stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: stickerPayloadUrl, name: name || "Figurinha Favorita" }),
      });
      if (res.ok) {
        const newSticker = await res.json();
        setSavedStickers((prev) => [newSticker, ...prev]);
        showToast("⭐ Figurinha salva nos seus favoritos!");
      } else {
        const errBody = await res.json().catch(() => ({}));
        showToast(errBody?.error || "Não foi possível favoritar esta figurinha.");
      }
    } catch (e) {
      console.error(e);
      showToast("Erro ao favoritar figurinha.");
    }
  };

  const handleDeleteSticker = async (stickerId: string) => {
    try {
      await fetch(`/api/chat/stickers?id=${stickerId}`, { method: "DELETE" });
      setSavedStickers(prev => prev.filter(s => s.id !== stickerId));
      showToast("Figurinha removida.");
    } catch (e) {}
  };

  const insertEmoji = (emoji: string) => {
    recordRecentEmoji(emoji);
    if (reactionTargetMessageId) {
      const targetId = reactionTargetMessageId;
      setReactionTargetMessageId(null);
      setShowMediaPicker(false);
      handleToggleReaction(targetId, emoji);
      return;
    }

    const inputEl = inputRef.current;
    const savedSel = cursorSelectionRef.current;
    const start = inputEl?.selectionStart ?? savedSel?.start ?? input.length;
    const end = inputEl?.selectionEnd ?? savedSel?.end ?? input.length;

    const nextText = input.slice(0, start) + emoji + input.slice(end);
    const nextPos = start + emoji.length;
    setInput(nextText);
    cursorSelectionRef.current = { start: nextPos, end: nextPos };

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        try {
          inputRef.current.setSelectionRange(nextPos, nextPos);
        } catch {}
      }
    });
  };

  const getGroupedReactions = (reactions: Reaction[] = []) => {
    const map = new Map<string, { count: number; users: string[]; hasReacted: boolean }>();
    for (const r of reactions) {
      const cur = map.get(r.emoji) || { count: 0, users: [], hasReacted: false };
      cur.count += 1;
      if (r.user?.name && !cur.users.includes(r.user.name)) {
        cur.users.push(r.user.name);
      }
      if (r.user_id === currentUser.id) {
        cur.hasReacted = true;
      }
      map.set(r.emoji, cur);
    }
    return Array.from(map.entries()).map(([emoji, data]) => ({ emoji, ...data }));
  };

  const isUserActive = (userId: string) => {
    if (!activeChannel || activeChannel.is_group) return false;
    return activeChannel.members?.some(m => m.id === userId);
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 h-full min-h-0 flex bg-background border-0 sm:border border-border sm:rounded-xl overflow-hidden shadow-xs relative">
      
      {/* Toast de Notificação */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Input Oculto de Arquivos */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Modais Integrados do CONNECT CHAT 2.0 */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        currentUser={currentUser}
        users={userList}
        departments={departments}
        onGroupCreated={(created) => {
          setChannels(prev => [...prev, created]);
          setActiveChannelId(created.id);
          showToast(`Grupo "${created.name}" criado com sucesso!`);
        }}
      />

      <StickerCreatorModal
        isOpen={isStickerCreatorOpen}
        onClose={() => setIsStickerCreatorOpen(false)}
        onStickerCreated={(saved) => {
          setSavedStickers(prev => [saved, ...prev]);
          showToast("Figurinha criada e disponível para envio!");
        }}
      />

      <CallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        targetName={activeChannel?.is_group ? (activeChannel.name || "Canal") : (activeDMUser?.name || "Usuário")}
        targetAvatar={activeDMUser?.avatar}
        callType={callType}
      />

      <ForwardModal
        isOpen={!!forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        messageContent={forwardingMessage?.content || ""}
        messageType={forwardingMessage?.type}
        fileName={forwardingMessage?.file_name}
        fileSize={forwardingMessage?.file_size}
        channels={channels}
        users={userList}
        currentUser={currentUser}
        onForward={handleForwardMessage}
      />

      <MediaLightbox
        isOpen={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        mediaUrl={lightboxUrl}
        mediaTitle={lightboxTitle}
      />

      <TicketShareModal
        isOpen={isTicketShareOpen}
        onClose={() => setIsTicketShareOpen(false)}
        onSelectTicket={shareTicket}
      />

      <ChatSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeChannelId={activeChannelId}
        activeChannelName={activeChannel?.is_group ? (activeChannel?.name || "Canal") : (activeDMUser?.name || "Conversa")}
        isMuted={mutedChannels.includes(activeChannelId)}
        onToggleMuteChannel={toggleMuteChannel}
      />

      {/* ========================================================================= */}
      {/* SIDEBAR DE CANAIS, GRUPOS E MENSAGENS DIRETAS                             */}
      {/* ========================================================================= */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-80 border-r border-border bg-surface flex-col h-full flex-shrink-0 min-h-0`}>
        
        {/* Header da Sidebar com Botão Criar Grupo e Status de Conexão */}
        <div className="p-3.5 sm:p-4 border-b border-border space-y-2.5 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2 truncate">
              <MessageSquare className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">SYNGETI Connect 2.0</span>
            </h2>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border transition-colors"
                title="Preferências de Som, Notificações e Privacidade"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1 text-[11px] font-bold"
                title="Criar Novo Grupo ou Canal"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo</span>
              </button>
            </div>
          </div>

          {/* Indicador de Estado de Conexão em Tempo Real */}
          <div className="flex items-center justify-between text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-background border border-border">
            {connectionState === "realtime" && (
              <span className="flex items-center gap-1.5 text-emerald-500">
                <Wifi className="w-3 h-3" />
                <span>Tempo Real Ativo (WebSocket)</span>
              </span>
            )}
            {connectionState === "connecting" && (
              <span className="flex items-center gap-1.5 text-amber-500">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Sincronizando canal seguro...</span>
              </span>
            )}
            {connectionState === "polling" && (
              <span className="flex items-center gap-1.5 text-cyan-400">
                <RefreshCw className="w-3 h-3" />
                <span>Sincronização ativa (HTTPS)</span>
              </span>
            )}
            {connectionState === "offline" && (
              <span className="flex items-center gap-1.5 text-red-500">
                <WifiOff className="w-3 h-3" />
                <span>Sem conexão — aguardando rede</span>
              </span>
            )}
            <span className="text-muted-foreground">
              {onlineCount} online
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar canal ou colaborador..."
              className="w-full bg-background border border-border text-foreground text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Listas Roláveis */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6 min-h-0">
          
          {/* 1. Canais e Grupos de Equipe */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span>Canais & Grupos</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {groupChannels.length}
              </span>
            </div>
            <ul className="space-y-1">
              {groupChannels.map(channel => {
                const isActive = activeChannelId === channel.id;
                const unreadCount = unreadByChannel[channel.id] || 0;
                const isMuted = mutedChannels.includes(channel.id);
                return (
                  <li key={channel.id}>
                    <button
                      onClick={() => {
                        setActiveChannelId(channel.id);
                        setMobileView('chat');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                        isActive 
                          ? 'bg-primary text-white shadow-sm' 
                          : unreadCount > 0
                            ? 'bg-primary/10 text-foreground font-bold border border-primary/30'
                            : 'text-foreground hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Hash className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-primary'}`} />
                        <span className="truncate">{channel.name || "Geral"}</span>
                        {isMuted && <BellOff className="w-3 h-3 opacity-60 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unreadCount > 0 && !isActive && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold leading-none shadow-xs">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                        {channel.members && channel.members.length > 0 && (
                          <span className={`text-[10px] opacity-75 shrink-0 ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                            {channel.members.length}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 2. Mensagens Diretas / Usuários */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Mensagens Diretas</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {userList.length}
              </span>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhum colaborador encontrado.
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredUsers.map(user => {
                  const active = isUserActive(user.id);
                  const dmChannel = channels.find(c => !c.is_group && c.members?.some(m => m.id === user.id));
                  const userUnread = (dmChannel ? unreadByChannel[dmChannel.id] : 0) || unreadByUser[user.id] || 0;
                  return (
                    <li key={user.id}>
                      <button
                        onClick={() => handleSelectUser(user)}
                        disabled={creatingDM}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left group ${
                          active 
                            ? 'bg-primary/15 text-primary border border-primary/30 font-semibold' 
                            : userUnread > 0
                              ? 'bg-primary/10 text-foreground border border-primary/30 font-bold'
                              : 'text-foreground hover:bg-surface-hover'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <UserAvatar name={user.name} url={user.avatar} className="w-8 h-8" />
                          <span 
                            className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full shadow-sm ${
                              user.isOnline ? 'bg-emerald-500 ring-1 ring-emerald-400/50' : 'bg-red-500 opacity-80'
                            }`}
                            title={user.isOnline ? "Online" : "Offline"}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-semibold text-xs group-hover:text-primary transition-colors">
                              {user.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {userUnread > 0 && !active && (
                                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold leading-none shadow-xs">
                                  {userUnread > 99 ? "99+" : userUnread}
                                </span>
                              )}
                              <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                user.isOnline ? 'text-emerald-500' : 'text-red-400/90'
                              }`}>
                                {user.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                            {user.job_title || user.email}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

        </div>

        {/* Rodapé da Sidebar - Usuário Atual */}
        <div className="p-3 border-t border-border bg-surface-elevated/40 flex items-center gap-3">
          <div className="relative">
            <UserAvatar name={currentUser.name} url={currentUser.avatar} className="w-8 h-8" />
            <span className="w-2.5 h-2.5 bg-emerald-500 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full shadow-sm ring-1 ring-emerald-400/50" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-foreground truncate">{currentUser.name}</div>
            <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Conectado (Você)
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ÁREA PRINCIPAL DA CONVERSA ATIVA                                          */}
      {/* ========================================================================= */}
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full bg-background min-w-0 min-h-0 relative`}>
        
        {/* Topbar da Conversa Ativa com Ações de Chamada */}
        <div className="h-16 px-3.5 sm:px-6 border-b border-border bg-surface flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="md:hidden p-2 -ml-1 mr-0.5 rounded-lg hover:bg-surface-hover text-foreground/80 hover:text-foreground transition-colors flex items-center justify-center flex-shrink-0"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {activeChannel?.is_group ? (
              <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold flex-shrink-0">
                <Hash className="w-5 h-5" />
              </div>
            ) : (
              <div className="relative flex-shrink-0">
                <UserAvatar 
                  name={activeDMUser?.name || "Usuário"} 
                  url={activeDMUser?.avatar} 
                  className="w-9 h-9 sm:w-10 sm:h-10" 
                />
                <span 
                  className={`w-3 h-3 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full shadow-sm ${
                    isTargetOnline ? "bg-emerald-500 ring-1 ring-emerald-400/50" : "bg-red-500 opacity-80"
                  }`} 
                />
              </div>
            )}
            
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                {activeChannel?.is_group ? (
                  `# ${activeChannel.name || "Geral"}`
                ) : (
                  activeDMUser?.name || "Chat Direto"
                )}
              </h2>
              <div className="text-[11px] text-muted-foreground truncate">
                {activeChannel?.is_group ? (
                  activeChannel.description || `${activeChannel.members?.length || 0} participantes`
                ) : (
                  <span className={isTargetOnline ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>
                    {isTargetOnline ? "Online agora" : "Offline"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ações da Conversa: Áudio, Vídeo, Busca e Mensagens Fixadas */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* Mensagens Fixadas Toggle */}
            {pinnedMessagesCount > 0 && (
              <button
                type="button"
                onClick={() => setShowPinnedOnly(prev => !prev)}
                className={`p-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold ${
                  showPinnedOnly ? "bg-amber-500 text-black shadow-sm" : "bg-surface-elevated text-muted-foreground hover:text-foreground"
                }`}
                title="Filtrar Mensagens Fixadas"
              >
                <Pin className="w-4 h-4 fill-current" />
                <span className="hidden sm:inline">{pinnedMessagesCount}</span>
              </button>
            )}

            {/* Busca no Chat */}
            <button
              type="button"
              onClick={() => {
                setShowChatSearch(prev => !prev);
                if (showChatSearch) setChatSearchQuery("");
              }}
              className={`p-2 rounded-xl transition-colors ${
                showChatSearch ? "bg-primary text-white" : "bg-surface-elevated text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
              title="Pesquisar mensagens"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Chamada de Áudio (WebRTC) */}
            <button
              type="button"
              onClick={() => {
                setCallType("audio");
                setIsCallModalOpen(true);
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-surface-elevated hover:bg-emerald-500/15 text-muted-foreground hover:text-emerald-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Iniciar Chamada de Áudio"
            >
              <Phone className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Voz</span>
            </button>

            {/* Chamada de Vídeo (WebRTC) */}
            <button
              type="button"
              onClick={() => {
                setCallType("video");
                setIsCallModalOpen(true);
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
              title="Iniciar Chamada de Vídeo"
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Vídeo</span>
            </button>

          </div>
        </div>

        {/* Barra de Pesquisa Rápida Interna no Chat */}
        {showChatSearch && (
          <div className="p-2.5 bg-surface-hover/60 border-b border-border flex items-center gap-2 animate-in fade-in">
            <Search className="w-4 h-4 text-primary shrink-0" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Pesquisar mensagens ou arquivos nesta conversa..."
              className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              autoFocus
            />
            {chatSearchQuery && (
              <button
                type="button"
                onClick={() => setChatSearchQuery("")}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Limpar
              </button>
            )}
          </div>
        )}

        {/* Barra Informativa de Filtro de Mensagens Fixadas */}
        {showPinnedOnly && (
          <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-500 text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 fill-amber-500" />
              Exibindo apenas mensagens fixadas ({displayedMessages.length})
            </span>
            <button
              type="button"
              onClick={() => setShowPinnedOnly(false)}
              className="text-[11px] underline font-bold"
            >
              Ver todas as mensagens
            </button>
          </div>
        )}
        
        {/* Feed de Mensagens */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar min-h-0">
          {displayedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16 px-4">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-foreground">
                {chatSearchQuery ? "Nenhum resultado para esta pesquisa." : "Nenhuma mensagem neste canal ainda."}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Envie uma mensagem de texto, imagem, documento ou figurinha para colaborar com a equipe.
              </p>
            </div>
          ) : (
            displayedMessages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser.id;
              const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
              const isSameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id;
              const groupedReactions = getGroupedReactions(msg.reactions);

              // Procura se tem mensagem respondida
              const repliedMessage = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

              return (
                <div 
                  key={msg.id} 
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  className={`flex gap-2 sm:gap-3 group/message relative ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrev ? 'mt-1' : 'mt-4 sm:mt-5'}`}
                >
                  {!isSameSenderAsPrev ? (
                    <UserAvatar name={msg.sender.name} url={msg.sender.avatar} className="w-7 h-7 sm:w-8 sm:h-8 mt-1 flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
                  )}
                  
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[88%] sm:max-w-[78%] relative`}>
                    
                    {/* Cabeçalho do Remetente */}
                    {!isSameSenderAsPrev && (
                      <div className="flex items-baseline gap-2 mb-1 px-1">
                        <span className="text-xs font-bold text-foreground">
                          {isMe ? 'Você' : msg.sender.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium" suppressHydrationWarning>
                          {(() => {
                            try {
                              return new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });
                            } catch {
                              return "";
                            }
                          })()}
                        </span>
                        {msg.is_pinned && (
                          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-0.5">
                            <Pin className="w-3 h-3 fill-amber-500" />
                            Fixada
                          </span>
                        )}
                        {msg.is_edited && (
                          <span className="text-[9px] text-muted-foreground italic">(editada)</span>
                        )}
                      </div>
                    )}

                    {/* Bloco de Citação / Resposta (Reply) */}
                    {repliedMessage && (
                      <div className="mb-1 p-2 rounded-xl bg-surface-hover/80 border-l-4 border-primary text-[11px] text-muted-foreground max-w-full truncate">
                        <span className="font-bold text-foreground block">
                          {repliedMessage.sender_id === currentUser.id ? "Você" : repliedMessage.sender.name}
                        </span>
                        <span className="truncate block">
                          {repliedMessage.type === "sticker"
                            ? "✨ Figurinha"
                            : repliedMessage.type === "gif"
                              ? "🎬 GIF"
                              : repliedMessage.type === "image"
                                ? "📷 Imagem"
                                : repliedMessage.type === "video"
                                  ? "🎥 Vídeo"
                                  : repliedMessage.type === "audio"
                                    ? "🎤 Mensagem de voz"
                                    : repliedMessage.type === "file"
                                      ? `📄 ${repliedMessage.file_name || "Arquivo"}`
                                      : repliedMessage.content}
                        </span>
                      </div>
                    )}

                    {/* Balão de Conteúdo (Texto, Imagem, Vídeo, Áudio, Arquivo, Figurinha, GIF) */}
                    <div className="relative group/bubble">
                      
                      {/* Modo de Edição Inline */}
                      {editingMessageId === msg.id ? (
                        <div className="p-2 bg-surface border border-primary rounded-xl space-y-2 min-w-[280px]">
                          <input
                            type="text"
                            value={editInput}
                            onChange={(e) => setEditInput(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMessageId(null)}
                              className="px-2.5 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(msg.id)}
                              className="px-3 py-1 rounded bg-primary text-white text-[11px] font-bold hover:bg-primary-hover"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* 1. Imagem */}
                          {msg.type === "image" && (
                            <div className="relative group/media overflow-hidden rounded-2xl border border-border/60 bg-surface/80 p-1 shadow-xs">
                              {brokenMediaIds[msg.id] ? (
                                <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground bg-surface rounded-xl">
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span>Mídia indisponível</span>
                                </div>
                              ) : (
                                <>
                                  <img 
                                    src={msg.content} 
                                    alt="Imagem"
                                    onError={() => setBrokenMediaIds((prev) => ({ ...prev, [msg.id]: true }))}
                                    onClick={() => {
                                      setLightboxUrl(msg.content);
                                      setLightboxTitle(msg.file_name || "Imagem Compartilhada");
                                    }}
                                    className="rounded-xl object-contain max-w-full max-h-64 sm:max-h-80 cursor-pointer hover:opacity-95 transition-opacity"
                                    loading="lazy"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSticker(msg.content)}
                                    className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/80 hover:bg-black text-amber-300 text-[10px] font-bold opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center gap-1 shadow-md border border-amber-400/30"
                                  >
                                    <Star className="w-3 h-3 fill-amber-300" />
                                    <span>Favoritar</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {/* 2. Vídeo */}
                          {msg.type === "video" && (
                            <div className="rounded-2xl border border-border overflow-hidden bg-black max-w-sm sm:max-w-md shadow-md">
                              <video 
                                src={msg.content} 
                                controls 
                                className="w-full max-h-72 object-contain"
                              />
                            </div>
                          )}

                          {/* 3. Gravação de Áudio / Mensagem de Voz */}
                          {msg.type === "audio" && (
                            <div className={`p-3 rounded-2xl border shadow-xs flex flex-col gap-1.5 ${
                              isMe ? 'bg-primary text-white rounded-tr-xs' : 'bg-surface border-border text-foreground rounded-tl-xs'
                            }`}>
                              <div className="flex items-center gap-2 text-xs font-bold">
                                <Volume2 className="w-4 h-4 text-emerald-400" />
                                <span>Mensagem de Voz</span>
                                {msg.file_size && <span className="opacity-70 text-[10px] font-normal">• {formatFileSize(msg.file_size)}</span>}
                              </div>
                              <audio src={msg.content} controls className="h-8 max-w-[240px] sm:max-w-[280px]" />
                            </div>
                          )}

                          {/* 4. Documento / Arquivo Geral (PDF, DOCX, XLSX, etc.) */}
                          {msg.type === "file" && (
                            <div className={`p-3.5 rounded-2xl border shadow-xs flex items-center gap-3 min-w-[220px] max-w-sm ${
                              isMe ? 'bg-primary/10 border-primary/30 text-foreground' : 'bg-surface border-border text-foreground'
                            }`}>
                              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate text-foreground">{msg.file_name || "Arquivo"}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(msg.file_size)}</p>
                              </div>
                              <a
                                href={msg.content}
                                download={msg.file_name || "download"}
                                className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border transition-colors shrink-0"
                                title="Baixar Arquivo"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}

                          {/* 5. Figurinha ou GIF */}
                          {(msg.type === "sticker" || msg.type === "gif") && (
                            <div className="relative group/media overflow-hidden rounded-2xl border border-border/60 bg-surface/80 p-1 shadow-xs">
                              {brokenMediaIds[msg.id] ? (
                                <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground bg-surface rounded-xl">
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span>{msg.type === "sticker" ? "Figurinha indisponível" : "Mídia indisponível"}</span>
                                </div>
                              ) : (
                                <>
                                  <img 
                                    src={msg.content} 
                                    alt="Figurinha ou GIF"
                                    onError={() => setBrokenMediaIds((prev) => ({ ...prev, [msg.id]: true }))}
                                    className={`rounded-xl object-contain max-w-full ${
                                      msg.type === "sticker" ? "max-h-36 sm:max-h-44 bg-transparent" : "max-h-52 sm:max-h-60"
                                    }`}
                                    loading="lazy"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSticker(msg.content)}
                                    className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/80 hover:bg-black text-amber-300 text-[10px] font-bold opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center gap-1 shadow-md border border-amber-400/30"
                                  >
                                    <Star className="w-3 h-3 fill-amber-300" />
                                    <span>Favoritar</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {/* 6. Card de Chamado compartilhado */}
                          {msg.type === "ticket" && (() => {
                            let meta: any = null;
                            try { meta = msg.metadata ? JSON.parse(msg.metadata) : null; } catch {}
                            return meta?.ticketId ? (
                              <TicketShareCard data={meta} isMe={isMe} />
                            ) : (
                              <div className="px-3.5 py-2 rounded-2xl text-xs bg-surface border border-border">{msg.content}</div>
                            );
                          })()}

                          {/* 7. Texto Padrão */}
                          {(!msg.type || msg.type === "text") && (
                            <div 
                              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap shadow-xs ${
                                isMe 
                                  ? 'bg-primary text-white rounded-tr-xs' 
                                  : 'bg-surface border border-border text-foreground rounded-tl-xs'
                              }`}
                            >
                              {msg.content}
                            </div>
                          )}
                        </>
                      )}

                      {/* Barra Flutuante de Ações e Reações (Hover - Estilo Teams / WhatsApp) */}
                      <div 
                        className={`absolute -top-4 ${isMe ? 'right-2' : 'left-2'} z-20 hidden group-hover/message:flex items-center gap-0.5 bg-surface border border-border shadow-lg rounded-full px-2 py-0.5 animate-in fade-in duration-150`}
                      >
                        {/* 8 Emojis de Reação Rápida (👍 ❤️ 😂 😮 😢 👏 ✅ 🎉) */}
                        {QUICK_REACTION_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-hover hover:scale-125 transition-transform text-xs"
                            title={`Reagir com ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}

                        {/* Botão "+" para abrir biblioteca completa de emojis para reagir */}
                        <button
                          type="button"
                          onClick={() => {
                            setReactionTargetMessageId(msg.id);
                            setMediaTab("emojis");
                            setShowMediaPicker(true);
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors"
                          title="Mais emojis para reagir"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <span className="w-px h-3.5 bg-border mx-1" />

                        {/* Responder */}
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(msg);
                            inputRef.current?.focus();
                          }}
                          className="p-1 rounded-full hover:bg-surface-hover text-muted-foreground hover:text-primary transition-colors"
                          title="Responder"
                        >
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Encaminhar */}
                        <button
                          type="button"
                          onClick={() => setForwardingMessage(msg)}
                          className="p-1 rounded-full hover:bg-surface-hover text-muted-foreground hover:text-primary transition-colors"
                          title="Encaminhar"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Fixar Mensagem */}
                        <button
                          type="button"
                          onClick={() => handleTogglePin(msg)}
                          className={`p-1 rounded-full hover:bg-surface-hover transition-colors ${
                            msg.is_pinned ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
                          }`}
                          title={msg.is_pinned ? "Desafixar" : "Fixar Mensagem"}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        {/* Se for autor: Editar e Excluir */}
                        {isMe && (
                          <>
                            {(!msg.type || msg.type === "text") && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(msg)}
                                className="p-1 rounded-full hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 rounded-full hover:bg-surface-hover text-muted-foreground hover:text-danger transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                    </div>

                    {/* Indicadores de Estado de Entrega e Leitura (WhatsApp / Teams) */}
                    {isMe && (() => {
                      const dState = getDeliveryState(msg);
                      const readReceipts = (msg.receipts || []).filter((r) => r.user_id !== currentUser.id && r.status === "READ");
                      return (
                        <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] select-none">
                          {dState === "SENDING" && (
                            <span className="flex items-center gap-1 text-muted-foreground font-medium">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Enviando...</span>
                            </span>
                          )}
                          {dState === "SENT" && (
                            <span className="flex items-center gap-0.5 text-muted-foreground font-medium" title="Enviada e gravada no servidor">
                              <Check className="w-3.5 h-3.5" />
                              <span>Enviada</span>
                            </span>
                          )}
                          {dState === "DELIVERED" && (
                            <span className="flex items-center gap-0.5 text-muted-foreground font-semibold" title="Entregue ao dispositivo do destinatário">
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Entregue</span>
                            </span>
                          )}
                          {dState === "READ" && (
                            <span className="flex items-center gap-0.5 text-cyan-400 font-bold" title="Visualizada pelo destinatário">
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                              <span>
                                {activeChannel?.is_group && readReceipts.length > 1
                                  ? `Lida (${readReceipts.length})`
                                  : "Lida"}
                              </span>
                            </span>
                          )}
                          {dState === "FAILED" && (
                            <div className="flex items-center gap-1.5 text-red-500 font-bold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>
                                {msg.type === "sticker"
                                  ? "Não foi possível enviar a figurinha."
                                  : "Falha no envio."}
                              </span>
                              <button
                                type="button"
                                onClick={() => retryFailedMessage(msg)}
                                className="underline hover:text-red-400 ml-1"
                              >
                                Tentar novamente
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Pílulas de Reações Abaixo da Mensagem (com tooltip detalhado de participantes) */}
                    {groupedReactions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1 px-1">
                        {groupedReactions.map(r => (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, r.emoji)}
                            title={r.users.length > 0 ? `Reagido por: ${r.users.join(', ')}` : "Clique para alternar sua reação"}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                              r.hasReacted 
                                ? 'bg-primary/15 border-primary/40 text-primary shadow-xs' 
                                : 'bg-surface border-border text-foreground/80 hover:bg-surface-hover'
                            }`}
                          >
                            <span className="text-xs leading-none">{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setReactionTargetMessageId(msg.id);
                            setMediaTab("emojis");
                            setShowMediaPicker(true);
                          }}
                          title="Adicionar outra reação"
                          className="w-6 h-5 rounded-full border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
                        >
                          <Smile className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Banner de Resposta (Reply To) */}
        {replyingTo && (
          <div className="px-4 py-2 bg-surface-elevated border-t border-border flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2 truncate">
              <CornerDownLeft className="w-4 h-4 text-primary shrink-0" />
              <div className="truncate">
                <span className="font-bold text-foreground">
                  Respondendo a {replyingTo.sender_id === currentUser.id ? "Você" : replyingTo.sender.name}:
                </span>{" "}
                <span className="text-muted-foreground truncate">
                  {replyingTo.type === "sticker"
                    ? "✨ Figurinha"
                    : replyingTo.type === "gif"
                      ? "🎬 GIF"
                      : replyingTo.type === "image"
                        ? "📷 Imagem"
                        : replyingTo.type === "video"
                          ? "🎥 Vídeo"
                          : replyingTo.type === "audio"
                            ? "🎤 Mensagem de voz"
                            : replyingTo.type === "file"
                              ? `📄 ${replyingTo.file_name || "Arquivo"}`
                              : replyingTo.content.slice(0, 60)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Drawer de Mídia (Emojis Profissionais, Figurinhas, GIFs) */}
        {showMediaPicker && (
          <div 
            ref={pickerRef}
            className="absolute bottom-16 sm:bottom-20 left-2 right-2 sm:left-6 sm:right-auto sm:w-[420px] max-h-[450px] bg-surface border border-border rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2"
          >
            {/* Header com Abas */}
            <div className="flex items-center justify-between border-b border-border p-2 bg-surface-hover/50">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMediaTab('emojis')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    mediaTab === 'emojis' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>{reactionTargetMessageId ? "Reagir com Emoji" : "Emojis"}</span>
                </button>
                {!reactionTargetMessageId && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMediaTab('stickers')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        mediaTab === 'stickers' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>Figurinhas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaTab('gifs')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        mediaTab === 'gifs' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>GIFs</span>
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMediaPicker(false);
                  setReactionTargetMessageId(null);
                }}
                className="p-1 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground"
                title="Fechar (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo Aba 1: BIBLIOTECA COMPLETA DE EMOJIS (10 Categorias, Busca, Recentes, Favoritos, Tons de Pele) */}
            {mediaTab === 'emojis' && (
              <EmojiPickerPanel
                onSelectEmoji={insertEmoji}
                recentEmojis={recentEmojis}
                favoriteEmojis={favoriteEmojis}
                onToggleFavorite={handleToggleFavoriteEmoji}
                skinTone={emojiSkinTone}
                onChangeSkinTone={handleChangeSkinTone}
              />
            )}

            {/* Conteúdo Aba 2: FIGURINHAS COM BOTÃO "CRIAR FIGURINHA" */}
            {mediaTab === 'stickers' && (
              <div className="flex flex-col flex-1 overflow-hidden p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Suas Figurinhas ({savedStickers.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMediaPicker(false);
                      setIsStickerCreatorOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar Figurinha</span>
                  </button>
                </div>

                <div className="overflow-y-auto max-h-60 custom-scrollbar space-y-3">
                  {savedStickers.length === 0 ? (
                    <div className="p-3 text-center rounded-xl bg-surface-hover/30 border border-dashed border-border text-xs text-muted-foreground">
                      <Star className="w-5 h-5 mx-auto mb-1 text-muted-foreground/40" />
                      <p className="font-semibold">Nenhuma figurinha criada ainda.</p>
                      <p className="text-[10px] mt-0.5">Clique em &quot;Criar Figurinha&quot; para fazer a sua ou favorite no chat!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {savedStickers.map(stk => (
                        <div key={stk.id} className="relative group/stk rounded-xl overflow-hidden border border-border bg-surface aspect-square flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => sendMedia(stk.url, "sticker")}
                            className="w-full h-full p-1 hover:scale-105 transition-transform"
                          >
                            <img src={stk.url} alt="Figurinha" className="w-full h-full object-contain" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSticker(stk.id)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-danger text-white opacity-0 group-hover/stk:opacity-100 transition-opacity shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Padrão do Sistema */}
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                      Corporativas Padrão
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DEFAULT_SYSTEM_STICKERS.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => sendMedia(item.url, "sticker")}
                          className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border hover:border-primary/50 hover:bg-surface-hover transition-all text-left group"
                        >
                          <img src={item.url} alt={item.name} className="w-8 h-8 rounded-lg object-cover" />
                          <span className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Aba 3: GIFs */}
            {mediaTab === 'gifs' && (
              <div className="flex flex-col flex-1 overflow-hidden p-2.5 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    placeholder="Pesquisar GIFs animados..."
                    className="w-full bg-background border border-border text-foreground text-xs rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 overflow-y-auto max-h-60 custom-scrollbar">
                  {gifs.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => sendMedia(g.url, "gif")}
                      className="relative group/gif rounded-lg overflow-hidden border border-border bg-black/10 aspect-video hover:scale-105 transition-transform"
                    >
                      <img src={g.preview || g.url} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BARRA DE COMPOSIÇÃO DE MENSAGENS COM ÁUDIO, ANEXOS E EMOJIS              */}
        {/* ========================================================================= */}
        <div className="p-2.5 sm:p-4 bg-surface border-t border-border flex-shrink-0">
          
          {/* Gravador de Voz Ativo */}
          {isRecordingAudio ? (
            <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto p-2 bg-red-500/10 border border-red-500/30 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                  Gravando Áudio: {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:{(recordingSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecordingAudio}
                  className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={stopRecordingAudio}
                  className="px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Áudio</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="flex items-center gap-1.5 sm:gap-2 max-w-5xl mx-auto">
              
              {/* Botão de Anexo (Fotos, Vídeos, Documentos) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="p-2 sm:p-2.5 rounded-xl bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shrink-0 disabled:opacity-50"
                title="Anexar arquivo, foto ou documento"
              >
                {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Paperclip className="w-5 h-5" />}
              </button>

              {/* Botão Seletor de Emojis, Figurinhas e GIFs */}
              <button
                type="button"
                onClick={() => {
                  setReactionTargetMessageId(null);
                  setShowMediaPicker(prev => !prev);
                  setMediaTab('emojis');
                }}
                className={`p-2 sm:p-2.5 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${
                  showMediaPicker 
                    ? 'bg-primary/15 text-primary border-primary/40' 
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                }`}
                title="Emojis, Figurinhas e GIFs"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Botão Compartilhar Chamado do Service Desk */}
              <button
                type="button"
                onClick={() => setIsTicketShareOpen(true)}
                className="p-2 sm:p-2.5 rounded-xl bg-background border border-border text-muted-foreground hover:text-primary hover:bg-surface-hover transition-colors flex items-center justify-center shrink-0"
                title="Compartilhar Chamado do Service Desk"
              >
                <Ticket className="w-5 h-5" />
              </button>

              {/* Input de Mensagem com rastreamento de cursor para inserção exata de emojis */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  cursorSelectionRef.current = {
                    start: e.target.selectionStart ?? e.target.value.length,
                    end: e.target.selectionEnd ?? e.target.value.length,
                  };
                }}
                onSelect={(e) => {
                  const t = e.currentTarget;
                  cursorSelectionRef.current = {
                    start: t.selectionStart ?? t.value.length,
                    end: t.selectionEnd ?? t.value.length,
                  };
                }}
                onKeyUp={(e) => {
                  const t = e.currentTarget;
                  cursorSelectionRef.current = {
                    start: t.selectionStart ?? t.value.length,
                    end: t.selectionEnd ?? t.value.length,
                  };
                }}
                onClick={(e) => {
                  const t = e.currentTarget;
                  cursorSelectionRef.current = {
                    start: t.selectionStart ?? t.value.length,
                    end: t.selectionEnd ?? t.value.length,
                  };
                }}
                placeholder={
                  activeChannel?.is_group 
                    ? `Mensagem #${activeChannel.name || "Geral"}...` 
                    : `Mensagem para ${activeDMUser?.name || "usuário"}...`
                }
                className="flex-1 border border-border bg-background rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground min-w-0"
              />

              {/* Gravação de Voz (Microfone) quando o campo estiver vazio */}
              {!input.trim() ? (
                <button
                  type="button"
                  onClick={startRecordingAudio}
                  className="p-2.5 sm:p-3 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-primary transition-colors flex items-center justify-center shrink-0"
                  title="Gravar mensagem de voz"
                >
                  <Mic className="w-5 h-5" />
                </button>
              ) : (
                /* Botão Enviar Mensagem */
                <button
                  type="submit"
                  className="bg-primary text-white rounded-xl px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold hover:bg-primary-hover transition-all shadow-sm flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                  title="Enviar mensagem"
                >
                  <span className="hidden sm:inline">Enviar</span>
                  <Send className="w-4 h-4" />
                </button>
              )}

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
