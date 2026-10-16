"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { User as UserIcon, Search, Hash, MessageSquare, Send, Circle, ArrowLeft } from "lucide-react";
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

type Message = {
  id: string;
  content: string;
  sender: { name: string; avatar?: string | null };
  created_at: string;
  sender_id: string;
};

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep channels and users in sync if props change
  useEffect(() => {
    setChannels(initialChannels);
  }, [initialChannels]);

  useEffect(() => {
    setUserList(initialUsers);
  }, [initialUsers]);

  // Polling em segundo plano para manter a lista de todos os usuários e o status Online/Offline sempre atualizados
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
    } catch (e) {
      // Ignora erro momentâneo de conexão
    }
  };

  useEffect(() => {
    fetchUsersAndPresence();
    const interval = setInterval(fetchUsersAndPresence, 8000); // Atualiza presença a cada 8s
    const handleVis = () => { if (!document.hidden) fetchUsersAndPresence(); };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      clearInterval(interval);
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
    const interval = setInterval(fetchMessages, 3500); // Polling inteligente a cada 3.5 segundos
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
    // 1. Look for existing DM channel with this user
    const existing = channels.find(c => 
      !c.is_group && 
      c.members?.some(m => m.id === targetUser.id)
    );

    if (existing) {
      setActiveChannelId(existing.id);
      return;
    }

    // 2. Create or find via backend API
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChannelId) return;

    const currentInput = input;
    setInput("");

    // Optimistic UI update
    setMessages(prev => [...prev, {
      id: "opt_" + Date.now(),
      content: currentInput,
      sender: { name: currentUser.name, avatar: currentUser.avatar },
      created_at: new Date().toISOString(),
      sender_id: currentUser.id
    }]);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: activeChannelId, content: currentInput })
      });
      fetchMessages();
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    }
  };

  // Check if a user currently has an open active DM
  const isUserActive = (userId: string) => {
    if (!activeChannel || activeChannel.is_group) return false;
    return activeChannel.members?.some(m => m.id === userId);
  };

  return (
    <div className="flex-1 h-full min-h-0 flex bg-background border-0 sm:border border-border sm:rounded-xl overflow-hidden shadow-xs">
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
                              className="w-3 h-3 bg-zinc-600 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full opacity-60" 
                              title="Offline"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-semibold text-xs group-hover:text-primary transition-colors">
                              {user.name}
                            </span>
                            {user.isOnline ? (
                              <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Online
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider flex-shrink-0">
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
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full bg-background min-w-0 min-h-0`}>
        
        {/* Topbar da Conversa Ativa */}
        <div className="h-16 px-3.5 sm:px-6 border-b border-border bg-surface flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Botão Voltar para Lista de Conversas no Mobile */}
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
                  <span className="w-3 h-3 bg-emerald-500 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full ring-1 ring-emerald-400/50 shadow-sm" />
                ) : (
                  <span className="w-3 h-3 bg-zinc-600 absolute -bottom-0.5 -right-0.5 border-2 border-surface rounded-full opacity-60" />
                )}
              </div>
            )}
            
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                {activeChannel?.is_group ? (
                  `# ${activeChannel.name || "Geral"}`
                ) : (
                  `@ ${activeDMUser?.name || "Chat Direto"}`
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
                    <span className="text-muted-foreground font-medium flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
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

              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-2 sm:gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrev ? 'mt-1' : 'mt-4 sm:mt-5'}`}
                >
                  {!isSameSenderAsPrev ? (
                    <UserAvatar name={msg.sender.name} url={msg.sender.avatar} className="w-7 h-7 sm:w-8 sm:h-8 mt-1 flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
                  )}
                  
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
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
                    <div 
                      className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap shadow-xs ${
                        isMe 
                          ? 'bg-primary text-white rounded-tr-xs' 
                          : 'bg-surface border border-border text-foreground rounded-tl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Formulário de Envio */}
        <div className="p-2.5 sm:p-4 bg-surface border-t border-border flex-shrink-0">
          <form onSubmit={sendMessage} className="flex items-center gap-2 sm:gap-3 max-w-5xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeChannel?.is_group 
                  ? `Mensagem #${activeChannel.name || "Geral"}...` 
                  : `Mensagem para ${activeDMUser?.name || "usuário"}...`
              }
              className="flex-1 border border-border bg-background rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
            />
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
