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
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Cadastros': true,
    'Configurações': true,
  });
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    fetch("/api/branding")
      .then(res => res.json())
      .then(data => setBranding(data))
      .catch(console.error);
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
    <aside className="w-[280px] bg-sidebar border-r border-border h-full flex flex-col transition-colors duration-300">
      {/* Brand */}
      <div className="h-[72px] flex items-center justify-between px-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          {branding?.appLogo ? (
            <img src={branding.appLogo} alt="SYNGETI" className="h-10 max-w-[180px] object-contain" />
          ) : (
            <>
              <svg width="24" height="28" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 0L93.3013 25V75L50 100L6.69873 75V25L50 0Z" fill="#0E1628"/>
                <path d="M75 37.5L50 25L25 37.5V62.5L50 75L75 62.5V37.5Z" fill="url(#paint0_linear)"/>
                <path d="M50 25V75" stroke="#00C2FF" strokeWidth="8"/>
                <path d="M25 37.5L50 50L75 37.5" stroke="#007BFF" strokeWidth="8"/>
                <path d="M25 62.5L50 50L75 62.5" stroke="#007BFF" strokeWidth="8"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="25" y1="25" x2="75" y2="75" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#007BFF"/>
                    <stop offset="1" stopColor="#00C2FF"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex flex-col mt-1">
                <span className="font-extrabold text-foreground text-xl tracking-widest leading-none block">
                  SYNGE<span className="text-[#00C2FF]">TI</span>
                </span>
                <span className="text-[9px] text-muted-foreground tracking-[0.1em] font-semibold mt-0.5 uppercase">Plataforma</span>
              </div>
            </>
          )}
        </div>
        <button className="w-7 h-7 rounded bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
        {navItems.map((item) => {
          const hasSubItems = !!item.subItems;
          const active = hasSubItems 
            ? item.subItems!.some(sub => isCurrent(sub.href))
            : item.href && isCurrent(item.href);
            
          const isExpanded = expandedMenus[item.name];

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
                  {/* Linha guia (Left border guide for subitems) */}
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
