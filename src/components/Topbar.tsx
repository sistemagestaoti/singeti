"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Menu } from "lucide-react";

const MODULE_DATA: Record<string, { title: string, subtitle: string }> = {
  'dashboard': { title: 'Módulo de Gestão', subtitle: 'SYNGETI • Visão Geral e Indicadores' },
  'cmdb': { title: 'Módulo de Inventário', subtitle: 'SYNGETI • Gestão de Ativos e Licenças' },
  'service-desk': { title: 'Módulo de Atendimento', subtitle: 'SYNGETI • Service Desk e Chamados' },
  'problems': { title: 'Módulo de Problemas', subtitle: 'SYNGETI • Gestão de Incidentes Maiores' },
  'changes': { title: 'Módulo de Mudanças', subtitle: 'SYNGETI • Planejamento e Risco' },
  'projects': { title: 'Módulo de Projetos', subtitle: 'SYNGETI • Planejamento e Tarefas' },
  'bookings': { title: 'Módulo de Reservas', subtitle: 'SYNGETI • Alocação de Recursos' },
  'contracts': { title: 'Módulo de Contratos', subtitle: 'SYNGETI • Parceiros e Fornecedores' },
  'knowledge': { title: 'Módulo de Conhecimento', subtitle: 'SYNGETI • Wiki e Procedimentos' },
  'connect': { title: 'CONNECT CHAT', subtitle: 'SYNGETI • Comunicação Corporativa' },
  'users': { title: 'Módulo de Cadastros', subtitle: 'SYNGETI • Gestão de Colaboradores' },
  'settings': { title: 'Módulo de Configurações', subtitle: 'SYNGETI • Sistema e Acessos' },
};

import { useMobileMenu } from "./AuthenticatedShell";

export function Topbar({ userName, avatar }: { userName: string, avatar?: string | null }) {
  const pathname = usePathname();
  const { toggleMobileMenu } = useMobileMenu();
  const heartbeatStarted = useRef(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    // Inicia heartbeat uma única vez por sessão — não a cada troca de aba
    if (heartbeatStarted.current) return;
    heartbeatStarted.current = true;

    const sendHeartbeat = () => {
      fetch("/api/chat/presence", { method: "POST" }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Format pathname into module mapping
  const pathSegments = pathname?.split('/').filter(Boolean) || [];
  const rootPath = pathSegments.length > 0 ? pathSegments[0] : 'dashboard';
  
  const moduleInfo = MODULE_DATA[rootPath] || { 
    title: 'Módulo do Sistema', 
    subtitle: 'SYNGETI • Gestão Inteligente' 
  };

  return (
    <header className="h-[60px] sm:h-[72px] bg-background border-b border-border flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 transition-colors duration-300">
      
      {/* Title area (Hamburger + Titles) */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 mr-2">
        <button 
          type="button"
          onClick={toggleMobileMenu}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground hover:bg-surface-hover transition-colors shadow-xs shrink-0"
          title="Abrir menu de navegação"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-lg md:text-xl font-bold text-foreground leading-tight truncate">
            {moduleInfo.title}
          </h1>
          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase mt-0.5 truncate hidden sm:block">
            {moduleInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        <ThemeSwitcher />
        
        <div className="flex items-center space-x-2 sm:space-x-3 border-l border-border pl-2 sm:pl-4">
          <div className="text-sm text-right hidden lg:block">
            <p className="font-bold text-foreground leading-tight truncate max-w-[120px]">{userName}</p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Admin</p>
          </div>
          
          {avatar && !avatarError ? (
            <img 
              src={avatar} 
              alt={userName} 
              onError={() => setAvatarError(true)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover border border-border shadow-xs bg-surface shrink-0" 
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-extrabold text-xs sm:text-sm shadow-xs shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}

          <button 
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("syngeti_session_active");
                sessionStorage.removeItem("syngeti_login_time");
              }
              signOut({ callbackUrl: "/login" });
            }}
            className="px-2 py-1 rounded text-xs font-bold text-danger hover:bg-danger/10 transition-colors cursor-pointer shrink-0"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
