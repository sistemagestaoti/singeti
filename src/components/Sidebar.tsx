"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Server, HeadphonesIcon, 
  AlertTriangle, ArrowRightLeft, CalendarClock, 
  Briefcase, MessageSquare, BookOpen, Settings, 
  Users, ChevronDown, ChevronRight, FileText, Database, Shield, X, Monitor
} from "lucide-react";
import { useMobileMenu } from "./AuthenticatedShell";

// Cache em memória do branding para evitar fetch repetido a cada troca de aba
let brandingMemoryCache: any = null;
let brandingCacheFetching = false;

export function Sidebar({ initialBranding }: { initialBranding?: any } = {}) {
  const router = useRouter();
  const { isMobileOpen, closeMobileMenu, navigatingTo, startNavigation } = useMobileMenu();
  const pathname = usePathname();

  // Prefetch inteligente sob demanda ao aproximar o mouse (elimina a latência de clique sem causar prefetch storm inicial)
  const prefetchRoute = useCallback((href?: string) => {
    if (href && href !== "#" && !href.startsWith("http")) {
      try {
        router.prefetch(href);
      } catch {}
    }
  }, [router]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Gestão de Acessos': true,
    'Cadastros': true,
    'Configurações': true,
  });
  if (initialBranding && !brandingMemoryCache) {
    brandingMemoryCache = initialBranding;
  }
  const [branding, setBranding] = useState<any>(initialBranding || brandingMemoryCache);
  const [logoError, setLogoError] = useState(false);
  const [iconError, setIconError] = useState(false);
  const hasFetched = useRef(!!initialBranding || !!brandingMemoryCache);

  useEffect(() => {
    const fetchBrandingData = (force = false) => {
      // Usa cache em memória — evita request HTTP a cada troca de aba
      if (!force && brandingMemoryCache) {
        setBranding(brandingMemoryCache);
        return;
      }
      // Evita requests duplicadas simultâneas
      if (brandingCacheFetching && !force) return;

      brandingCacheFetching = true;
      fetch("/api/branding")
        .then(res => res.json())
        .then(data => {
          brandingMemoryCache = data;
          brandingCacheFetching = false;
          setBranding(data);
          setLogoError(false);
          setIconError(false);
        })
        .catch(err => {
          brandingCacheFetching = false;
          console.error(err);
        });
    };

    // Só faz fetch na primeira montagem real se não veio pelo SSR
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchBrandingData();
    }

    // Quando o usuário atualiza o branding, força re-fetch
    const handleBrandingUpdated = () => {
      brandingMemoryCache = null;
      fetchBrandingData(true);
    };

    window.addEventListener("branding-updated", handleBrandingUpdated);
    return () => window.removeEventListener("branding-updated", handleBrandingUpdated);
  }, []);

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isCurrent = (path: string) => pathname?.startsWith(path);
  const isNavActive = (path: string) => {
    if (navigatingTo) {
      return navigatingTo === path || navigatingTo.startsWith(path + "/");
    }
    return isCurrent(path);
  };

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
      subtitle: "Chamados e suporte",
      href: "/service-desk", 
      icon: HeadphonesIcon 
    },
    { 
      name: "Gestão de Acessos", 
      subtitle: "E-mails, PCs e senhas",
      icon: Shield,
      subItems: [
        { name: "Contas de E-mail dos Domínios", href: "/pc-access?tab=emails" },
        { name: "Computadores (PCs)", href: "/pc-access" },
        { name: "Colaboradores & Usuários", href: "/pc-access?tab=collaborators" },
        { name: "Trilha de Auditoria & Cofre", href: "/pc-access?tab=audit" },
      ]
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
        { name: "Contas de E-mail dos Domínios", href: "/pc-access?tab=emails" },
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
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-border h-full flex flex-col transition-transform duration-300 select-none
        ${isMobileOpen ? "translate-x-0 w-[280px] shadow-2xl" : "-translate-x-full"}
        md:relative md:z-20 md:translate-x-0
        ${isCollapsed ? "md:w-[76px]" : "md:w-[280px]"}
      `}
    >
      {/* Brand Header */}
      <div className={`h-[60px] sm:h-[72px] flex items-center ${isCollapsed ? 'md:justify-center md:px-2' : ''} justify-between px-3.5 border-b border-border/50`}>
        {/* Expanded mode or Mobile drawer (always expanded on mobile) */}
        <div className={`items-center gap-3 flex-1 h-full min-w-0 mr-1.5 ${isCollapsed ? 'hidden md:hidden' : 'flex'}`}>
          {/* CAMPO SEPARADO SOMENTE PARA O ÍCONE */}
          <div className="w-10 h-10 rounded-xl bg-surface/50 border border-border/60 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-1">
            {branding?.appIcon && !iconError ? (
              <img 
                src={branding.appIcon} 
                alt="Ícone" 
                onError={() => setIconError(true)}
                className="w-full h-full object-contain" 
              />
            ) : (
              <svg width="26" height="30" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
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
            )}
          </div>

          {/* ÁREA DO LOGOTIPO */}
          <div className="flex-1 h-full flex items-center overflow-hidden min-w-0">
            {branding?.appLogo && !logoError ? (
              <img 
                src={branding.appLogo} 
                alt="Logotipo" 
                onError={() => setLogoError(true)}
                className="max-h-[44px] w-auto max-w-full object-contain object-left transition-all" 
              />
            ) : (
              <div className="flex flex-col justify-center min-w-0">
                <span className="font-extrabold text-foreground text-xl tracking-wider leading-none block truncate">
                  SYNGE<span className="text-[#00C2FF]">TI</span>
                </span>
                <span className="text-[9px] text-muted-foreground tracking-[0.14em] font-semibold mt-1 uppercase truncate">
                  GESTÃO INTEGRADA DE TI
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Collapsed Mode (Desktop only) */}
        {isCollapsed && (
          <div className="hidden md:flex items-center justify-center w-full">
            <div className="w-10 h-10 rounded-xl bg-surface/50 border border-border/60 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-1">
              {branding?.appIcon && !iconError ? (
                <img 
                  src={branding.appIcon} 
                  alt="Ícone" 
                  onError={() => setIconError(true)}
                  className="w-full h-full object-contain" 
                />
              ) : (
                <svg width="26" height="30" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 0L93.3013 25V75L50 100L6.69873 75V25L50 0Z" fill="#0E1628"/>
                  <path d="M75 37.5L50 25L25 37.5V62.5L50 75L75 62.5V37.5Z" fill="url(#paint0_linear_icon)"/>
                  <path d="M50 25V75" stroke="#00C2FF" strokeWidth="8"/>
                  <path d="M25 37.5L50 50L75 37.5" stroke="#007BFF" strokeWidth="8"/>
                  <path d="M25 62.5L50 50L75 62.5" stroke="#007BFF" strokeWidth="8"/>
                  <defs>
                    <linearGradient id="paint0_linear_icon" x1="25" y1="25" x2="75" y2="75" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#007BFF"/>
                      <stop offset="1" stopColor="#00C2FF"/>
                    </linearGradient>
                  </defs>
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Mobile close drawer button */}
        <button
          type="button"
          onClick={closeMobileMenu}
          className="md:hidden w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0"
          title="Fechar menu"
          aria-label="Fechar menu lateral"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Desktop collapse/expand button */}
        <button 
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex w-7 h-7 rounded bg-surface border border-border items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
          title={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-5 ${isCollapsed ? 'md:px-2 px-3' : 'px-3'} space-y-1.5 custom-scrollbar`}>
        {navItems.map((item) => {
          const hasSubItems = !!item.subItems;
          const active = hasSubItems 
            ? item.subItems!.some(sub => isNavActive(sub.href))
            : item.href && isNavActive(item.href);
            
          const isExpanded = expandedMenus[item.name];

          if (isCollapsed) {
            // Renderização no modo recolhido (desktop apenas)
            const targetHref = item.href || item.subItems?.[0]?.href || '#';
            return (
              <Link
                key={item.name}
                href={targetHref}
                prefetch={false}
                onMouseEnter={() => prefetchRoute(targetHref)}
                onFocus={() => prefetchRoute(targetHref)}
                onClick={() => {
                  startNavigation(targetHref);
                  closeMobileMenu();
                }}
                title={item.name}
                className={`flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 ${
                  active 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-muted-foreground hover:bg-sidebar-active/50 hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
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
                  onMouseEnter={() => {
                    item.subItems?.forEach(sub => prefetchRoute(sub.href));
                  }}
                  onFocus={() => {
                    item.subItems?.forEach(sub => prefetchRoute(sub.href));
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleMenu(item.name);
                  }}
                  className={`w-full text-left flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group
                    ${active ? 'bg-sidebar-active/30' : 'hover:bg-sidebar-active/50'}`}
                >
                  {ItemContent}
                </button>
              ) : (
                <Link
                  href={item.href!}
                  prefetch={false}
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
                  onClick={() => {
                    startNavigation(item.href!);
                    closeMobileMenu();
                  }}
                  className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group
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
                    const subActive = isNavActive(subItem.href);
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        prefetch={false}
                        onMouseEnter={() => prefetchRoute(subItem.href)}
                        onFocus={() => prefetchRoute(subItem.href)}
                        onClick={() => {
                          startNavigation(subItem.href);
                          closeMobileMenu();
                        }}
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
