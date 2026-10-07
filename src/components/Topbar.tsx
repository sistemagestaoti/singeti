"use client";

import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Menu } from "lucide-react";

const MODULE_DATA: Record<string, { title: string, subtitle: string }> = {
  'dashboard': { title: 'Módulo de Gestão', subtitle: 'SINGETI • Visão Geral e Indicadores' },
  'cmdb': { title: 'Módulo de Inventário', subtitle: 'SINGETI • Gestão de Ativos e Licenças' },
  'service-desk': { title: 'Módulo de Atendimento', subtitle: 'SINGETI • Service Desk e Chamados' },
  'problems': { title: 'Módulo de Problemas', subtitle: 'SINGETI • Gestão de Incidentes Maiores' },
  'changes': { title: 'Módulo de Mudanças', subtitle: 'SINGETI • Planejamento e Risco' },
  'projects': { title: 'Módulo de Projetos', subtitle: 'SINGETI • Planejamento e Tarefas' },
  'bookings': { title: 'Módulo de Reservas', subtitle: 'SINGETI • Alocação de Recursos' },
  'contracts': { title: 'Módulo de Contratos', subtitle: 'SINGETI • Parceiros e Fornecedores' },
  'knowledge': { title: 'Módulo de Conhecimento', subtitle: 'SINGETI • Wiki e Procedimentos' },
  'connect': { title: 'CONNECT CHAT', subtitle: 'SINGETI • Comunicação Corporativa' },
  'users': { title: 'Módulo de Cadastros', subtitle: 'SINGETI • Gestão de Colaboradores' },
  'settings': { title: 'Módulo de Configurações', subtitle: 'SINGETI • Sistema e Acessos' },
};

export function Topbar({ userName, avatar }: { userName: string, avatar?: string | null }) {
  const pathname = usePathname();
  
  // Format pathname into module mapping
  const pathSegments = pathname?.split('/').filter(Boolean) || [];
  const rootPath = pathSegments.length > 0 ? pathSegments[0] : 'dashboard';
  
  const moduleInfo = MODULE_DATA[rootPath] || { 
    title: 'Módulo do Sistema', 
    subtitle: 'SINGETI • Gestão Inteligente' 
  };

  return (
    <header className="h-[72px] bg-background border-b border-border flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-300">
      
      {/* Title area (Hamburger + Titles) */}
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground hover:bg-surface-hover transition-colors shadow-sm">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-foreground leading-tight">
            {moduleInfo.title}
          </h1>
          <p className="text-xs font-semibold text-muted-foreground uppercase mt-0.5">
            {moduleInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-5">
        <ThemeSwitcher />
        
        <div className="flex items-center space-x-3 border-l border-border pl-5">
          <div className="text-sm text-right hidden sm:block">
            <p className="font-bold text-foreground leading-tight">{userName}</p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Admin</p>
          </div>
          
          {avatar ? (
            <img src={avatar} alt={userName} className="w-10 h-10 rounded-lg object-cover border border-border shadow-sm bg-surface" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-extrabold shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}

          <a href="/api/auth/signout" className="ml-2 text-xs font-bold text-danger hover:text-danger/80 transition-colors">
            Sair
          </a>
        </div>
      </div>
    </header>
  );
}
