"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  User as UserIcon, Search, Hash, MessageSquare, Send, Circle, ArrowLeft,
  Smile, Heart, ThumbsUp, Sparkles, Star, Trash2, X, Image as ImageIcon, Flame, Check, Loader2
} from "lucide-react";
import Image from "next/image";

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
  is_group: boolean;
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
  type?: string; // "text" | "gif" | "sticker" | "image"
  sender: { name: string; avatar?: string | null };
  created_at: string;
  sender_id: string;
  reactions?: Reaction[];
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

// Emojis pré-categorizados para o seletor integrado
const EMOJI_CATEGORIES = [
  {
    name: "Populares",
    emojis: ["👍", "❤️", "😂", "🔥", "🎉", "👏", "🙌", "😊", "🚀", "✨", "💯", "✅"]
  },
  {
    name: "Rostos & Emoções",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😎", "🤓", "🧐", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😴", "🤯", "🥳", "🥺", "😢", "😭", "😤", "😡", "😷", "🤒"]
  },
  {
    name: "Gestos & Mãos",
    emojis: ["👍", "👎", "👌", "🤌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤝", "🙏", "✍️", "💪", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🫡"]
  },
  {
    name: "Trabalho & TI",
    emojis: ["💻", "🖥️", "⌨️", "🖱️", "📱", "💾", "💿", "⚙️", "🔧", "🔨", "🔒", "🔑", "🛡️", "📡", "🌐", "🔋", "🔌", "💡", "☕", "📂", "📁", "📊", "📈", "📉", "📋", "📌", "📍", "✉️", "📧", "📞", "⏰", "⏱️", "⏳"]
  },
  {
    name: "Celebração & Status",
    emojis: ["🎉", "🎊", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "⭐", "🌟", "✨", "🔥", "💥", "🎯", "🚀", "🛸", "🟢", "🟡", "🔴", "⚪", "⚫", "⚠️", "⛔", "🚫", "❌", "❓", "❗", "✔️", "✅"]
  }
];

// Figurinhas padrão corporativas do sistema (disponíveis imediatamente para todos)
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

const QUICK_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉"];

function UserAvatar({ name, url, className = "w-8 h-8" }: { name: string; url?: string | null; className?: string }) {
  if (url) {
    return (
      <div className={`${className} rounded-full overflow-hidden border border-border flex-shrink-0 bg-surface relative`}>
        <Image src={url} alt={name} width={40} height={40} className="w-full h-full object-cover" />
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
  mainChannelId
}: { 
  currentUser: { id: string; name: string; avatar?: string | null };
  users: User[];
  channels: Channel[];
  mainChannelId: string;
}) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [userList, setUserList] = useState<User[]>(initialUsers);
  const [activeChannelId, setActiveChannelId] = useState(mainChannelId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [creatingDM, setCreatingDM] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  // Estados para Mídia: Emojis, Figurinhas e GIFs
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTab, setMediaTab] = useState<'emojis' | 'stickers' | 'gifs'>('emojis');
  const [activeEmojiCategory, setActiveEmojiCategory] = useState("Populares");
  
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Exibe toast temporário
  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fecha o picker ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMediaPicker(false);
      }
    }
    if (showMediaPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMediaPicker]);

  // Keep channels and users in sync if props change
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

  // Polling e heartbeat em segundo plano para manter a presença Online/Offline sempre atualizada
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
    // Heartbeat leve a cada 7 segundos para presença em tempo real com baixo overhead
    const heartbeatInterval = setInterval(sendHeartbeatAndUpdatePresence, 7000);
    // Recarregamento completo da lista de usuários a cada 60 segundos
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

  // Determine the counterpart user if active channel is a Direct Message
  const activeDMUser = useMemo(() => {
    if (!activeChannel || activeChannel.is_group) return null;
    const otherMember = activeChannel.members?.find(m => m.id !== currentUser.id);
    if (otherMember) {
      const fullUser = userList.find(u => u.id === otherMember.id || (u.email && u.email === otherMember.email));
      return fullUser || otherMember;
    }
    return null;
  }, [activeChannel, currentUser.id, userList]);

  // Fetch messages for active channel
  const fetchMessages = async () => {
    if (!activeChannelId) return;
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch(`/api/chat?channelId=${activeChannelId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3500);
    const handleVis = () => { if (!document.hidden) fetchMessages(); };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [activeChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filtered lists and presence metrics
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
    setInput("");

    // Optimistic UI update
    const optId = "opt_" + Date.now();
    setMessages(prev => [...prev, {
      id: optId,
      content: currentInput,
      type: "text",
      sender: { name: currentUser.name, avatar: currentUser.avatar },
      created_at: new Date().toISOString(),
      sender_id: currentUser.id,
      reactions: []
    }]);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: activeChannelId, content: currentInput, type: "text" })
      });
      fetchMessages();
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    }
  };

  // Enviar mídia direta (Figurinha ou GIF)
  const sendMedia = async (url: string, type: "gif" | "sticker") => {
    if (!url || !activeChannelId) return;
    setShowMediaPicker(false);

    // Optimistic UI update
    const optId = "opt_" + Date.now();
    setMessages(prev => [...prev, {
      id: optId,
      content: url,
      type,
      sender: { name: currentUser.name, avatar: currentUser.avatar },
      created_at: new Date().toISOString(),
      sender_id: currentUser.id,
      reactions: []
    }]);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: activeChannelId, content: url, type })
      });
      fetchMessages();
    } catch (err) {
      console.error("Erro ao enviar mídia:", err);
    }
  };

  // Inserir emoji no campo de texto
  const insertEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // Alternar reação (curtir / emoji) em uma mensagem
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    // Atualização otimista imediata na interface (0ms)
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
      }
    } catch (e) {
      console.error("Erro ao atualizar reação:", e);
      fetchMessages();
    }
  };

  // Salvar imagem/GIF/figurinha como favorita
  const handleSaveSticker = async (url: string, name?: string) => {
    try {
      const res = await fetch("/api/chat/stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name: name || "Figurinha Favorita" })
      });
      if (res.ok) {
        const newSticker = await res.json();
        setSavedStickers(prev => {
          if (prev.some(s => s.id === newSticker.id || s.url === newSticker.url)) return prev;
          return [newSticker, ...prev];
        });
        showToast("⭐ Figurinha salva nos seus favoritos!");
      }
    } catch (e) {
      console.error("Erro ao salvar figurinha:", e);
    }
  };

  // Remover figurinha dos favoritos
  const handleDeleteSticker = async (stickerId: string) => {
    try {
      const res = await fetch(`/api/chat/stickers?id=${stickerId}`, { method: "DELETE" });
      if (res.ok) {
        setSavedStickers(prev => prev.filter(s => s.id !== stickerId));
        showToast("Figurinha removida.");
      }
    } catch (e) {
      console.error("Erro ao remover figurinha:", e);
    }
  };

  // Agrupa reações por emoji para exibição nas pílulas
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

  // Verifica se é URL de imagem ou GIF
  const isMediaUrl = (text: string, type?: string) => {
    if (type === "gif" || type === "sticker" || type === "image") return true;
    if (typeof text !== "string") return false;
    const clean = text.trim();
    return clean.startsWith("http") && (
      clean.includes("giphy.com") ||
      clean.includes("unsplash.com") ||
      clean.endsWith(".gif") ||
      clean.endsWith(".png") ||
      clean.endsWith(".jpg") ||
      clean.endsWith(".jpeg") ||
      clean.endsWith(".webp")
    );
  };

  // Check if a user currently has an open active DM
  const isUserActive = (userId: string) => {
    if (!activeChannel || activeChannel.is_group) return false;
    return activeChannel.members?.some(m => m.id === userId);
  };

  return (
    <div className="flex-1 h-full min-h-0 flex bg-background border-0 sm:border border-border sm:rounded-xl overflow-hidden shadow-xs relative">
      
      {/* Toast de Notificação */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar de Canais e Usuários */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-80 border-r border-border bg-surface flex-col h-full flex-shrink-0 min-h-0`}>
        
        {/* Header da Sidebar com Busca */}
        <div className="p-3.5 sm:p-4 border-b border-border space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              SYNGETI Connect
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {onlineCount} {onlineCount === 1 ? 'online' : 'online'}
              </span>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuário ou canal..."
              className="w-full bg-background border border-border text-foreground text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Listas Roláveis */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6 min-h-0">
          
          {/* 1. Canais de Equipe */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Canais de Equipe
              </span>
              <span className="text-[10px] text-muted-foreground">
                {groupChannels.length}
              </span>
            </div>
            <ul className="space-y-1">
              {groupChannels.map(channel => {
                const isActive = activeChannelId === channel.id;
                return (
                  <li key={channel.id}>
                    <button
                      onClick={() => {
                        setActiveChannelId(channel.id);
                        setMobileView('chat');
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-foreground hover:bg-surface-hover hover:text-foreground'
                      }`}
                    >
                      <Hash className={`w-4 h-4 ${isActive ? 'text-white' : 'text-primary'}`} />
                      <span className="truncate">{channel.name || "Geral"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 2. Mensagens Diretas / Usuários da Plataforma */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Mensagens Diretas
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {userList.length} cadastrados
              </span>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredUsers.map(user => {
                  const active = isUserActive(user.id);
                  return (
                    <li key={user.id}>
                      <button
                        onClick={() => handleSelectUser(user)}
                        disabled={creatingDM}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left group ${
                          active 
                            ? 'bg-primary/15 text-primary border border-primary/30 font-semibold' 
                            : 'text-foreground hover:bg-surface-hover'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <UserAvatar name={user.name} url={user.avatar} className="w-8 h-8" />
                          {user.isOnline ? (
                            <span 
                              className="w-3 h-3 bg-emerald-500 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full shadow-sm ring-1 ring-emerald-400/50" 
                              title="Online agora"
                            />
                          ) : (
                            <span 
                              className="w-3 h-3 bg-red-500 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full shadow-sm ring-1 ring-red-400/40 opacity-85" 
                              title="Offline"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-semibold text-xs group-hover:text-primary transition-colors flex items-center gap-1.5">
                              <span 
                                className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                                  user.isOnline 
                                    ? "bg-emerald-500 ring-1 ring-emerald-400/50 shadow-xs" 
                                    : "bg-red-500 ring-1 ring-red-400/40 opacity-80"
                                }`}
                                title={user.isOnline ? "Online" : "Offline"}
                              />
                              <span className="truncate">{user.name}</span>
                            </span>
                            {user.isOnline ? (
                              <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Online
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-red-400/90 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500/80"></span>
                                Offline
                              </span>
                            )}
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

      {/* Área Principal de Conversa */}
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full bg-background min-w-0 min-h-0 relative`}>
        
        {/* Topbar da Conversa Ativa */}
        <div className="h-16 px-3.5 sm:px-6 border-b border-border bg-surface flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Botão Voltar para Lista no Mobile */}
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="md:hidden p-2 -ml-1 mr-0.5 rounded-lg hover:bg-surface-hover text-foreground/80 hover:text-foreground transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Voltar para a lista de conversas"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {activeChannel?.is_group ? (
              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold flex-shrink-0">
                <Hash className="w-5 h-5" />
              </div>
            ) : (
              <div className="relative flex-shrink-0">
                <UserAvatar 
                  name={activeDMUser?.name || "Usuário"} 
                  url={activeDMUser?.avatar} 
                  className="w-9 h-9 sm:w-10 sm:h-10" 
                />
                {isTargetOnline ? (
                  <span className="w-3 h-3 bg-emerald-500 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full ring-1 ring-emerald-400/50 shadow-sm" title="Online" />
                ) : (
                  <span className="w-3 h-3 bg-red-500 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full ring-1 ring-red-400/40 shadow-sm opacity-85" title="Offline" />
                )}
              </div>
            )}
            
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                {activeChannel?.is_group ? (
                  `# ${activeChannel.name || "Geral"}`
                ) : (
                  <>
                    <span className="truncate">@{activeDMUser?.name || "Chat Direto"}</span>
                    <span 
                      className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                        isTargetOnline 
                          ? "bg-emerald-500 ring-1 ring-emerald-400/50 shadow-xs" 
                          : "bg-red-500 ring-1 ring-red-400/40 opacity-80"
                      }`}
                      title={isTargetOnline ? "Online" : "Offline"}
                    />
                  </>
                )}
              </h2>
              {activeChannel?.is_group ? (
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                  <span className="text-emerald-500 font-semibold flex items-center gap-1 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {onlineCount} {onlineCount === 1 ? 'membro online' : 'membros online'}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline truncate">Canal público da equipe de TI</span>
                </p>
              ) : (
                <div className="flex items-center gap-2 text-[11px] truncate mt-0.5">
                  {isTargetOnline ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Online agora
                    </span>
                  ) : (
                    <span className="text-red-400/90 font-medium flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500/80"></span>
                      Offline
                    </span>
                  )}
                  <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                  <span className="text-muted-foreground truncate hidden sm:inline">
                    {activeDMUser?.job_title ? `${activeDMUser.job_title} • ${activeDMUser.email}` : activeDMUser?.email || "Conversa direta"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Feed de Mensagens */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16 px-4">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-foreground">Nenhuma mensagem neste canal ainda.</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Inicie uma conversa digitando abaixo para compartilhar informações com {activeChannel?.is_group ? "a equipe" : activeDMUser?.name || "o usuário"}.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser.id;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const isSameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id;
              const groupedReactions = getGroupedReactions(msg.reactions);
              const isMedia = isMediaUrl(msg.content, msg.type);

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
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Balão de Conteúdo (Texto ou Mídia/Figurinha/GIF) */}
                    <div className="relative group/bubble">
                      {isMedia ? (
                        <div className="relative group/media overflow-hidden rounded-2xl border border-border/60 bg-surface/80 p-1 shadow-xs">
                          <img 
                            src={msg.content} 
                            alt={msg.type === "sticker" ? "Figurinha" : "GIF animado"}
                            className={`rounded-xl object-contain max-w-full ${
                              msg.type === "sticker" ? "max-h-36 sm:max-h-44 bg-transparent" : "max-h-52 sm:max-h-60"
                            }`}
                            loading="lazy"
                          />
                          {/* Botão de Salvar como Figurinha Favorita */}
                          <button
                            type="button"
                            onClick={() => handleSaveSticker(msg.content)}
                            className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/80 hover:bg-black text-amber-300 text-[10px] font-bold opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center gap-1 shadow-md border border-amber-400/30"
                            title="Salvar como figurinha favorita"
                          >
                            <Star className="w-3 h-3 fill-amber-300" />
                            <span>Favoritar</span>
                          </button>
                        </div>
                      ) : (
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

                      {/* Barra Flutuante de Reações Rápidas (Hover no Desktop / Botão no Mobile) */}
                      <div 
                        className={`absolute -top-3.5 ${isMe ? 'right-2' : 'left-2'} z-20 hidden group-hover/message:flex items-center gap-0.5 bg-surface border border-border shadow-md rounded-full px-1.5 py-0.5 animate-in fade-in duration-150`}
                      >
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
                      </div>

                    </div>

                    {/* Pílulas de Reações Abaixo da Mensagem */}
                    {groupedReactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 px-1">
                        {groupedReactions.map(r => (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, r.emoji)}
                            title={`Reagido por: ${r.users.join(', ')}`}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                              r.hasReacted 
                                ? 'bg-primary/15 border-primary/40 text-primary shadow-xs' 
                                : 'bg-surface border-border text-foreground/80 hover:bg-surface-hover'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Painel Flutuante / Drawer de Mídia (Emojis, Figurinhas, GIFs) */}
        {showMediaPicker && (
          <div 
            ref={pickerRef}
            className="absolute bottom-16 sm:bottom-20 left-2 right-2 sm:left-6 sm:right-auto sm:w-[380px] max-h-[380px] bg-surface border border-border rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2"
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
                  <span>Emojis</span>
                </button>
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
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="p-1 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo da Aba 1: EMOJIS */}
            {mediaTab === 'emojis' && (
              <div className="flex flex-col flex-1 overflow-hidden p-2">
                {/* Categorias de Emojis */}
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1.5 mb-1.5 border-b border-border/50 text-[10px]">
                  {EMOJI_CATEGORIES.map(cat => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setActiveEmojiCategory(cat.name)}
                      className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
                        activeEmojiCategory === cat.name ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                {/* Grade de Emojis */}
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 overflow-y-auto max-h-60 p-1 custom-scrollbar">
                  {EMOJI_CATEGORIES.find(c => c.name === activeEmojiCategory)?.emojis.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-surface-hover hover:scale-125 transition-transform"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conteúdo da Aba 2: FIGURINHAS */}
            {mediaTab === 'stickers' && (
              <div className="flex flex-col flex-1 overflow-hidden p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Suas Figurinhas Salvas ({savedStickers.length})
                  </span>
                </div>

                <div className="overflow-y-auto max-h-60 custom-scrollbar space-y-3">
                  {/* Figurinhas Favoritas do Usuário */}
                  {savedStickers.length === 0 ? (
                    <div className="p-3 text-center rounded-xl bg-surface-hover/30 border border-dashed border-border text-xs text-muted-foreground">
                      <Star className="w-5 h-5 mx-auto mb-1 text-muted-foreground/40" />
                      <p className="font-semibold">Nenhuma figurinha salva ainda.</p>
                      <p className="text-[10px] mt-0.5">Passe o mouse sobre qualquer imagem ou GIF no chat e clique em &quot;Favoritar&quot; para salvá-la aqui!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {savedStickers.map(stk => (
                        <div key={stk.id} className="relative group/stk rounded-xl overflow-hidden border border-border bg-surface aspect-square flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => sendMedia(stk.url, "sticker")}
                            className="w-full h-full p-1 hover:scale-105 transition-transform"
                            title="Clique para enviar"
                          >
                            <img src={stk.url} alt="Figurinha" className="w-full h-full object-contain" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSticker(stk.id)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-danger text-white opacity-0 group-hover/stk:opacity-100 transition-opacity shadow-sm"
                            title="Remover dos favoritos"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Figurinhas Rápidas do Sistema */}
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                      Figurinhas Rápidas do Sistema
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DEFAULT_SYSTEM_STICKERS.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => sendMedia(item.url, "sticker")}
                          className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border hover:border-primary/50 hover:bg-surface-hover transition-all text-left group"
                          title="Clique para enviar"
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

            {/* Conteúdo da Aba 3: GIFs */}
            {mediaTab === 'gifs' && (
              <div className="flex flex-col flex-1 overflow-hidden p-2.5 space-y-2">
                {/* Campo de Busca de GIFs */}
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

                {/* Filtro Rápido de Categorias */}
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-[10px]">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "comemoracao", label: "Festa 🎉" },
                    { id: "joinha", label: "Joinha 👍" },
                    { id: "ti", label: "TI / Código 💻" },
                    { id: "risos", label: "Risos 😂" },
                    { id: "aplausos", label: "Palmas 👏" },
                    { id: "pensando", label: "Pensando 🤔" },
                    { id: "saudacoes", label: "Bom dia ☕" }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setGifCategory(cat.id)}
                      className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition-colors ${
                        gifCategory === cat.id ? 'bg-primary text-white' : 'bg-surface-hover text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Grade de GIFs */}
                <div className="overflow-y-auto max-h-60 custom-scrollbar">
                  {loadingGifs ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Carregando GIFs...</span>
                    </div>
                  ) : gifs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      Nenhum GIF encontrado para &quot;{gifSearch}&quot;.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {gifs.map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => sendMedia(g.url, "gif")}
                          className="relative group/gif rounded-lg overflow-hidden border border-border bg-black/10 aspect-video hover:scale-105 transition-transform"
                          title={g.title}
                        >
                          <img src={g.preview || g.url} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/gif:opacity-100 transition-opacity flex items-end p-1">
                            <span className="text-[9px] text-white font-bold truncate drop-shadow">{g.title}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formulário de Envio com Barra Integrada */}
        <div className="p-2.5 sm:p-4 bg-surface border-t border-border flex-shrink-0">
          <form onSubmit={sendMessage} className="flex items-center gap-1.5 sm:gap-2 max-w-5xl mx-auto">
            
            {/* Botão para Abrir Seletor Integrado (Emojis, Figurinhas, GIFs) */}
            <button
              type="button"
              onClick={() => {
                setShowMediaPicker(prev => !prev);
                setMediaTab('emojis');
              }}
              className={`p-2 sm:p-2.5 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${
                showMediaPicker 
                  ? 'bg-primary/15 text-primary border-primary/40' 
                  : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover'
              }`}
              title="Emojis, Figurinhas e GIFs"
              aria-label="Abrir seletor de emojis e mídia"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Input de Mensagem */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeChannel?.is_group 
                  ? `Mensagem #${activeChannel.name || "Geral"}...` 
                  : `Mensagem para ${activeDMUser?.name || "usuário"}...`
              }
              className="flex-1 border border-border bg-background rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground min-w-0"
            />

            {/* Botão Enviar */}
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-primary text-white rounded-xl px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
              title="Enviar mensagem"
            >
              <span className="hidden sm:inline">Enviar</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
