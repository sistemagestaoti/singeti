"use client";

import { useState, useEffect, useRef } from "react";
import { User as UserIcon } from "lucide-react";
import Image from "next/image";

type User = { id: string; name: string; email: string; avatar?: string | null };
type Channel = { id: string; name: string | null; is_group: boolean };
type Message = { id: string; content: string; sender: { name: string; avatar?: string | null }; created_at: string; sender_id: string };

function Avatar({ name, url, className = "w-8 h-8" }: { name: string, url?: string | null, className?: string }) {
  if (url) {
    return (
      <div className={`${className} rounded-full overflow-hidden border border-border flex-shrink-0 bg-surface`}>
        <Image src={url} alt={name} width={40} height={40} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${className} rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0`}>
      {name ? name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
    </div>
  );
}

export default function ChatInterface({ 
  currentUser, 
  users, 
  channels,
  mainChannelId
}: { 
  currentUser: { id: string; name: string; avatar?: string | null };
  users: User[];
  channels: Channel[];
  mainChannelId: string;
}) {
  const [activeChannelId, setActiveChannelId] = useState(mainChannelId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const res = await fetch(`/api/chat?channelId=${activeChannelId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [activeChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const currentInput = input;
    setInput("");

    // Optimistic UI
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      content: currentInput,
      sender: { name: currentUser.name, avatar: currentUser.avatar },
      created_at: new Date().toISOString(),
      sender_id: currentUser.id
    }]);

    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: activeChannelId, content: currentInput })
    });
    
    fetchMessages();
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  return (
    <div className="flex h-full bg-surface border-t border-border">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-background flex flex-col">
        <div className="p-5 border-b border-border">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Canais de Equipe</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ul className="py-2 space-y-0.5">
            {channels.filter(c => c.is_group).map(channel => (
              <li key={channel.id} className="px-2">
                <button
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeChannelId === channel.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface hover:text-foreground'}`}
                >
                  <span className="opacity-50 mr-2">#</span>
                  {channel.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 px-6 border-b border-border bg-surface flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">
            {activeChannel?.is_group ? `# ${activeChannel.name}` : 'Chat'}
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background custom-scrollbar">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-10 font-medium">Nenhuma mensagem neste canal ainda.</div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser.id;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const isSameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id;

              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrev ? 'mt-1' : 'mt-6'}`}>
                  {!isSameSenderAsPrev ? (
                    <Avatar name={msg.sender.name} url={msg.sender.avatar} className="w-8 h-8 mt-1" />
                  ) : (
                    <div className="w-8 h-8 flex-shrink-0" />
                  )}
                  
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {!isSameSenderAsPrev && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-bold text-foreground">{isMe ? 'Você' : msg.sender.name}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-surface border border-border text-foreground rounded-tl-sm shadow-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-surface border-t border-border">
          <form onSubmit={sendMessage} className="flex space-x-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem para #Geral..."
              className="flex-1 border border-border bg-background rounded-full px-5 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-primary text-primary-foreground rounded-full px-8 py-3 text-sm font-bold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
