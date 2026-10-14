"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Server, HeadphonesIcon, 
  AlertTriangle, ArrowRightLeft, CalendarClock, 
  Briefcase, MessageSquare, BookOpen, Settings, 
  Users, ChevronDown, ChevronRight, FileText, Database, Shield
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Cadastros': true,
    'Configurações': true,
  });
  const [branding, setBranding] = useState<any>(null);
  const [imageError, setImageError] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/branding")
      .then(res => res.json())
      .then(data => setBranding(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/chat/sync");
        if (res.ok) {
          const data = await res.json();
          if (mounted && typeof data.totalUnread === "number") {
            setUnreadChatCount(data.totalUnread);
          }
        }
      } catch {
        // Silently catch background polling errors
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isCurrent = (path: string) => pathname?.startsWith(path);

  const navItems = [
    { 
      name: "Dashboard", 
      subtitle: "Visão geral logística",
      href: "/dashboard", 
      icon: LayoutDashboard 
    },
    { 
      name: "CMDB", 
      subtitle: "Inventário de TI",
      href: "/cmdb", 
      icon: Server 
    },
    { 
      name: "Service Desk", 
      subtitle: "Gestão de chamados",
      href: "/service-desk", 
      icon: HeadphonesIcon 
    },
    { 
      name: "Projetos", 
      subtitle: "Gestão e tarefas",
      href: "/projects", 
      icon: Briefcase 
    },
    { 
      name: "Contratos", 
      subtitle: "Financeiro e parceiros",
      href: "/contracts", 
      icon: FileText 
    },
    { 
      name: "Cadastros", 
      subtitle: "Base operacional",
      icon: Database,
      subItems: [
        { name: "Usuários do Sistema", href: "/users" },
        { name: "Departamentos", href: "/settings/departments" },
        { name: "Perfis e Acessos", href: "/settings/roles" },
        { name: "Recuperação de Senha", href: "/settings/password-resets" },
      ]
    },
    { 
      name: "CONNECT CHAT", 
      subtitle: "Comunicação integrada",
      href: "/connect", 
      icon: MessageSquare 
    },
    { 
      name: "Wiki TI", 
      subtitle: "Base de conhecimento",
      href: "/knowledge", 
      icon: BookOpen 
    },
    { 
      name: "Configurações", 
      subtitle: "Sistema e acesso",
      icon: Settings,
      subItems: [
        { name: "Identidade Visual", href: "/settings/branding" },
      ]
    },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-[76px]' : 'w-[280px]'} bg-sidebar border-r border-border h-full flex flex-col transition-all duration-300 relative select-none`}>
      {/* Brand Header */}
      <div className={`h-[72px] flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-border/50`}>
        {!isCollapsed ? (
          /* Ícone e Logotipo separados lado a lado */
          <div className="flex-1 flex items-center gap-3 h-full mr-2 overflow-hidden">
            {/* 1. Ícone separado à esquerda */}
            <div className="flex-shrink-0 flex items-center justify-center">
              {branding?.appIcon ? (
                <img 
                  src={branding.appIcon} 
                  alt="Ícone SYNGETI" 
                  className="w-9 h-9 object-contain" 
                />
              ) : (
                <img 
                  src="/branding/logo-icon.png" 
                  alt="Ícone SYNGETI" 
                  className="w-9 h-9 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              )}
            </div>

            {/* 2. Logotipo separado à direita */}
            <div className="flex items-center overflow-hidden">
              {branding?.appLogo && branding.appLogo !== '/api/branding/logo' && !imageError ? (
                <img 
                  src={branding.appLogo} 
                  alt="SYNGETI" 
                  onError={() => setImageError(true)}
                  className="max-h-[34px] w-auto max-w-[155px] object-contain object-left transition-all" 
                />
              ) : (
                <div className="flex flex-col">
                  <span className="font-extrabold text-foreground text-xl tracking-widest leading-none block">
                    SYNGE<span className="text-[#00C2FF]">TI</span>
                  </span>
                  <span className="text-[9px] text-muted-foreground tracking-[0.1em] font-semibold mt-0.5 uppercase">
                    Gestão de TI
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Somente o Ícone exibido no modo compacto */
          <div className="flex items-center justify-center w-full">
            {branding?.appIcon ? (
              <img src={branding.appIcon} alt="Ícone SYNGETI" className="w-9 h-9 object-contain" />
            ) : (
              <img src="/branding/logo-icon.png" alt="Ícone SYNGETI" className="w-9 h-9 object-contain" />
            )}
          </div>
        )}

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-7 h-7 rounded bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors flex-shrink-0"
          title={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-6 ${isCollapsed ? 'px-2' : 'px-3'} space-y-2 custom-scrollbar`}>
        {navItems.map((item) => {
          const hasSubItems = !!item.subItems;
          const active = hasSubItems 
            ? item.subItems!.some(sub => isCurrent(sub.href))
            : item.href && isCurrent(item.href);
            
          const isExpanded = expandedMenus[item.name];

          if (isCollapsed) {
            // Renderização no modo recolhido
            const targetHref = item.href || item.subItems?.[0]?.href || '#';
            return (
              <Link
                key={item.name}
                href={targetHref}
                title={item.name}
                className={`flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 relative ${
                  active 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-muted-foreground hover:bg-sidebar-active/50 hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name === "CONNECT CHAT" && unreadChatCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sidebar animate-pulse" />
                )}
              </Link>
            );
          }

          const ItemContent = (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <div className="flex flex-col text-left">
                  <span className={`text-sm font-bold ${active ? 'text-primary' : 'text-foreground'}`}>
                    {item.name}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground leading-tight">
                    {item.subtitle}
                  </span>
                </div>
              </div>
              {item.name === "CONNECT CHAT" && unreadChatCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
              {hasSubItems && (
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              )}
            </div>
          );

          return (
            <div key={item.name} className="flex flex-col">
              {hasSubItems ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleMenu(item.name);
                  }}
                  className={`w-full text-left flex items-center px-3 py-3 rounded-lg transition-all duration-200 group
                    ${active ? 'bg-sidebar-active/30' : 'hover:bg-sidebar-active/50'}`}
                >
                  {ItemContent}
                </button>
              ) : (
                <Link
                  href={item.href!}
                  className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200 group
                    ${active 
                      ? 'bg-primary/10 border-l-4 border-primary rounded-l-none' 
                      : 'border-l-4 border-transparent hover:bg-sidebar-active/50'
                    }`}
                >
                  {ItemContent}
                </Link>
              )}

              {/* SubItems rendering */}
              {hasSubItems && isExpanded && (
                <div className="mt-1 flex flex-col space-y-1 relative">
                  <div className="absolute left-[21px] top-0 bottom-2 w-px bg-border/60"></div>
                  
                  {item.subItems!.map((subItem) => {
                    const subActive = isCurrent(subItem.href);
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={`pl-11 pr-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200
                          ${subActive 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-muted-foreground hover:bg-sidebar-active/50 hover:text-foreground'
                          }`}
                      >
                        {subItem.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
