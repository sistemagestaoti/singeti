export type PermissionLevel = 'none' | 'read' | 'write' | 'admin';

export interface ModulePermissionDef {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const SYSTEM_MODULES: ModulePermissionDef[] = [
  {
    id: "dashboard",
    name: "Dashboard & Métricas",
    category: "Visão Geral",
    description: "Visualização de relatórios, gráficos de SLA e métricas gerais do sistema.",
  },
  {
    id: "cmdb",
    name: "Inventário de TI (CMDB)",
    category: "Operações",
    description: "Ativos de TI, computadores, dispositivos de rede, impressoras e licenças de software.",
  },
  {
    id: "service_desk",
    name: "Service Desk / Chamados",
    category: "Atendimento",
    description: "Gestão e abertura de chamados, incidentes, requisições de serviço e comentários.",
  },
  {
    id: "problems",
    name: "Gestão de Problemas (ITIL)",
    category: "Atendimento",
    description: "Investigação de causas-raiz, erros conhecidos e soluções de contorno.",
  },
  {
    id: "changes",
    name: "Gestão de Mudanças (GMUD)",
    category: "Atendimento",
    description: "Planos de execução de mudanças de TI, testes, rollback e aprovação.",
  },
  {
    id: "projects",
    name: "Projetos & Tarefas",
    category: "Gestão",
    description: "Projetos de infraestrutura/sistemas, cronogramas e atribuição de tarefas.",
  },
  {
    id: "contracts",
    name: "Contratos & Fornecedores",
    category: "Gestão",
    description: "Contratos de prestação de serviços, fornecedores parceiros e vencimentos.",
  },
  {
    id: "bookings",
    name: "Reservas de Recursos",
    category: "Operações",
    description: "Agendamento e empréstimo de salas, projetores e equipamentos portáteis.",
  },
  {
    id: "knowledge",
    name: "Wiki TI / Conhecimento",
    category: "Base Operacional",
    description: "Procedimentos operacionais, tutoriais, manuais e políticas internas.",
  },
  {
    id: "connect",
    name: "CONNECT CHAT",
    category: "Comunicação",
    description: "Mensagens diretas e canais corporativos da equipe de TI.",
  },
  {
    id: "users",
    name: "Gestão de Usuários & Setores",
    category: "Administração",
    description: "Cadastro de colaboradores, dados de contato, setores e redefinições de senha.",
  },
  {
    id: "roles",
    name: "Perfis e Acessos (Roles)",
    category: "Administração",
    description: "Criação e edição de perfis de permissão do sistema.",
  },
  {
    id: "branding",
    name: "Identidade Visual & Sistema",
    category: "Administração",
    description: "Logotipos, ícones, tela de login e configurações gerais da plataforma.",
  },
];

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, { label: string; badge: string; desc: string }> = {
  none: {
    label: "Sem Acesso",
    badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    desc: "Bloqueado para este perfil (módulo oculto)",
  },
  read: {
    label: "Somente Leitura",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    desc: "Pode consultar e visualizar dados, sem poder alterar ou cadastrar novos",
  },
  write: {
    label: "Leitura e Edição",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    desc: "Pode visualizar, criar novos registros e editar/sobrescrever existentes",
  },
  admin: {
    label: "Acesso Total",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    desc: "Controle completo: visualização, criação, edição, exclusão e administração",
  },
};

/**
 * Normaliza qualquer formato de permissão (JSON legado, boolean, array ou matriz moderna)
 * para um dicionário padronizado: Record<moduleId, PermissionLevel>
 */
export function normalizePermissions(raw: any): Record<string, PermissionLevel> {
  const result: Record<string, PermissionLevel> = {};

  // Inicializa todos com 'none'
  for (const m of SYSTEM_MODULES) {
    result[m.id] = "none";
  }

  if (!raw) return result;

  try {
    let parsed = raw;
    if (typeof raw === "string") {
      parsed = JSON.parse(raw);
    }

    // Se for objeto estruturado
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      // 1. Caso { all: true }
      if (parsed.all === true) {
        for (const m of SYSTEM_MODULES) {
          result[m.id] = "admin";
        }
        return result;
      }

      // 2. Mapeamento direto de níveis (ex: { cmdb: "write", users: "read" })
      for (const m of SYSTEM_MODULES) {
        const val = parsed[m.id];
        if (val === "admin" || val === "write" || val === "read" || val === "none") {
          result[m.id] = val;
        } else if (Array.isArray(val)) {
          // Legado no formato { assets: ["read", "write", "delete"] }
          if (val.includes("admin") || val.includes("delete")) result[m.id] = "admin";
          else if (val.includes("write") || val.includes("write_own")) result[m.id] = "write";
          else if (val.includes("read")) result[m.id] = "read";
        } else if (val === true) {
          result[m.id] = "admin";
        }
      }

      // Tratar aliases legados (ex: assets -> cmdb, tickets -> service_desk)
      if (parsed.assets) {
        const val = parsed.assets;
        if (Array.isArray(val)) {
          if (val.includes("delete")) result.cmdb = "admin";
          else if (val.includes("write")) result.cmdb = "write";
          else if (val.includes("read")) result.cmdb = "read";
        }
      }
      if (parsed.tickets) {
        const val = parsed.tickets;
        if (Array.isArray(val)) {
          if (val.includes("delete")) result.service_desk = "admin";
          else if (val.includes("write") || val.includes("write_own")) result.service_desk = "write";
          else if (val.includes("read")) result.service_desk = "read";
        }
      }

      return result;
    }

    // Se for array de permissões legadas (ex: ["cmdb_read", "cmdb_write"])
    if (Array.isArray(parsed)) {
      const items = parsed.map(String);
      for (const item of items) {
        if (item.includes("all")) {
          for (const m of SYSTEM_MODULES) result[m.id] = "admin";
          return result;
        }
        for (const m of SYSTEM_MODULES) {
          if (item.startsWith(m.id)) {
            if (item.endsWith("admin")) result[m.id] = "admin";
            else if (item.endsWith("write") && result[m.id] !== "admin") result[m.id] = "write";
            else if (item.endsWith("read") && result[m.id] === "none") result[m.id] = "read";
          }
        }
      }
    }
  } catch (e) {
    console.warn("Falha ao analisar permissões:", e);
  }

  return result;
}

/**
 * Retorna se o usuário pode acessar/visualizar o módulo
 */
export function canRead(permissions: any, moduleId: string): boolean {
  const norm = normalizePermissions(permissions);
  const lvl = norm[moduleId];
  return lvl === "read" || lvl === "write" || lvl === "admin";
}

/**
 * Retorna se o usuário pode editar/sobrescrever dados no módulo
 */
export function canWrite(permissions: any, moduleId: string): boolean {
  const norm = normalizePermissions(permissions);
  const lvl = norm[moduleId];
  return lvl === "write" || lvl === "admin";
}

/**
 * Retorna se o usuário tem privilégio total de administrador no módulo
 */
export function canAdmin(permissions: any, moduleId: string): boolean {
  const norm = normalizePermissions(permissions);
  const lvl = norm[moduleId];
  return lvl === "admin";
}
