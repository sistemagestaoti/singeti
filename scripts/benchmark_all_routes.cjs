const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to benchmark an async operation
async function measure(fn, iterations = 5) {
  const times = [];
  let result = null;
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    result = await fn();
    const t1 = performance.now();
    times.push(t1 - t0);
  }
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  const cold = times[0]; // first sample was cold
  return { p50, p95, cold, result };
}

async function runBenchmark() {
  console.log("================================================================================");
  console.log("   SYNGETI — BENCHMARK E MEDIÇÃO REAL DE TODAS AS ROTAS / ABAS DO SISTEMA       ");
  console.log("================================================================================\n");

  // Latência de ping básico no banco de dados (Supabase PgBouncer)
  const pingTimes = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    pingTimes.push(performance.now() - t0);
  }
  pingTimes.sort((a, b) => a - b);
  console.log(`[INFRA/REDE] Latência Base Round-Trip (Vercel -> Supabase):`);
  console.log(`  P50: ${pingTimes[2].toFixed(1)}ms | P95: ${pingTimes[4].toFixed(1)}ms | Mín: ${pingTimes[0].toFixed(1)}ms\n`);

  const results = [];

  // 1. Dashboard
  {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const m = await measure(async () => {
      return Promise.all([
        prisma.ticket.count({ where: { status: { in: ["NEW", "OPEN"] } } }),
        prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
        prisma.ticket.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
        prisma.ticket.count({
          where: {
            status: { in: ["RESOLVED", "CLOSED"] },
            resolved_at: { gte: startOfToday },
          },
        }),
        prisma.asset.count({ where: { status: "IN_USE" } }),
        prisma.ticket.groupBy({
          by: ["category_id"],
          _count: { id: true },
        }),
        prisma.ticketCategory.findMany(),
        prisma.ticket.findMany({
          take: 5,
          orderBy: { created_at: "desc" },
        }),
        prisma.asset.findMany({
          take: 4,
          orderBy: { created_at: "desc" },
          include: { department: true },
        }),
      ]);
    });
    results.push({
      modulo: "Dashboard",
      rota: "/dashboard",
      operacao: "Carregamento de KPIs e Gráficos",
      p50: m.p50,
      p95: m.p95,
      queries: 9,
      gargalo: "9 queries em paralelo (contagens e group by)",
      causa: "Volume de agregação de chamados e equipamentos",
    });
  }

  // 2. Service Desk (Chamados)
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.user.findFirst({ select: { id: true, name: true, role: true } }),
        prisma.ticketCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
        prisma.ticket.findMany({
          take: 500,
          include: {
            requester: { select: { id: true, name: true, email: true, avatar: true } },
            assigned_to: { select: { id: true, name: true, email: true, avatar: true } },
            category: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            asset: { select: { id: true, name: true, internal_id: true, asset_tag: true } },
          },
          orderBy: { created_at: "desc" },
        }),
        prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
        prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
      ]);
    });
    results.push({
      modulo: "Service Desk",
      rota: "/service-desk",
      operacao: "Listagem de Chamados e Filtros",
      p50: m.p50,
      p95: m.p95,
      queries: 5,
      gargalo: "Query take: 500 com 5 JOINs pesados",
      causa: "Volume massivo de dados transferidos sem paginação inicial no SSR",
    });
  }

  // 3. Detalhes de Chamado (Service Desk [id])
  {
    const firstTicket = await prisma.ticket.findFirst();
    if (firstTicket) {
      const m = await measure(async () => {
        return Promise.all([
          prisma.ticket.findUnique({
            where: { id: firstTicket.id },
            include: {
              requester: true,
              assigned_to: true,
              category: true,
              department: true,
              asset: true,
              comments: { include: { author: true }, orderBy: { created_at: "asc" } },
              items: { include: { asset: true }, orderBy: { created_at: "asc" } },
            },
          }),
          prisma.ticketCategory.findMany(),
          prisma.department.findMany(),
          prisma.asset.findMany({ select: { id: true, name: true, internal_id: true, asset_tag: true } }),
          prisma.user.findMany({ select: { id: true, name: true, email: true, job_title: true } }),
        ]);
      });
      results.push({
        modulo: "Service Desk / Detalhes",
        rota: `/service-desk/${firstTicket.id}`,
        operacao: "Abertura de Chamado Específico",
        p50: m.p50,
        p95: m.p95,
        queries: 5,
        gargalo: "Carregamento de timeline, itens e todas as listas relacionais",
        causa: "Busca completa de ativos e usuários para sidebar",
      });
    }
  }

  // 4. CMDB (Inventário)
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.asset.findMany({
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } },
          },
          orderBy: { created_at: "desc" },
          take: 10,
        }),
        prisma.asset.count(),
      ]);
    });
    results.push({
      modulo: "CMDB",
      rota: "/cmdb",
      operacao: "Listagem Paginada de Ativos",
      p50: m.p50,
      p95: m.p95,
      queries: 2,
      gargalo: "Index Scan rápido (take 10)",
      causa: "Consulta leve após índices criados",
    });
  }

  // 5. CONNECT CHAT
  {
    const currentUserId = "admin-master";
    const m = await measure(async () => {
      return Promise.all([
        prisma.user.findMany({
          select: { id: true, name: true, email: true, avatar: true, job_title: true, status: true },
          orderBy: { name: "asc" },
        }),
        prisma.chatChannel.findFirst({ where: { name: "Geral" } }),
        prisma.chatChannel.findMany({
          include: {
            members: { select: { id: true, name: true, avatar: true, email: true, job_title: true } },
          },
          orderBy: { created_at: "asc" },
        }),
      ]);
    });
    results.push({
      modulo: "CONNECT CHAT",
      rota: "/connect",
      operacao: "Abertura do Chat, Canais e Usuários",
      p50: m.p50,
      p95: m.p95,
      queries: 3,
      gargalo: "Canais com lista de membros aninhada",
      causa: "Transferência de todos os canais e membros no carregamento inicial",
    });
  }

  // 6. Contratos
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.contract.findMany({
          include: { supplier: true },
          orderBy: { created_at: "desc" },
        }),
        prisma.supplier.findMany(),
      ]);
    });
    results.push({
      modulo: "Contratos",
      rota: "/contracts",
      operacao: "Listagem de Contratos e Fornecedores",
      p50: m.p50,
      p95: m.p95,
      queries: 2,
      gargalo: "Tabela completa de fornecedores e contratos",
      causa: "Sem paginação (traz tabela inteira)",
    });
  }

  // 7. Projetos
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.project.findMany({
          include: {
            manager: { select: { id: true, name: true } },
            tasks: { select: { id: true, status: true } },
          },
          orderBy: { created_at: "desc" },
        }),
      ]);
    });
    results.push({
      modulo: "Projetos",
      rota: "/projects",
      operacao: "Listagem de Projetos e Tarefas",
      p50: m.p50,
      p95: m.p95,
      queries: 1,
      gargalo: "Busca de tarefas aninhadas",
      causa: "Sem paginação",
    });
  }

  // 8. Reservas (Bookings)
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.booking.findMany({
          include: {
            user: { select: { id: true, name: true } },
            asset: { select: { id: true, name: true, asset_tag: true } },
          },
          orderBy: { start_time: "desc" },
        }),
      ]);
    });
    results.push({
      modulo: "Reservas",
      rota: "/bookings",
      operacao: "Listagem de Reservas",
      p50: m.p50,
      p95: m.p95,
      queries: 1,
      gargalo: "Leve",
      causa: "Consulta simples com joins",
    });
  }

  // 9. Base de Conhecimento (Knowledge)
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.knowledgeArticle.findMany({
          include: {
            author: { select: { id: true, name: true } },
          },
          orderBy: { created_at: "desc" },
        }),
      ]);
    });
    results.push({
      modulo: "Base de Conhecimento",
      rota: "/knowledge",
      operacao: "Artigos da Wiki",
      p50: m.p50,
      p95: m.p95,
      queries: 1,
      gargalo: "Leve",
      causa: "Consulta simples",
    });
  }

  // 10. Gestão de Mudanças (Changes)
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.change.findMany({
          include: {
            requester: { select: { id: true, name: true, email: true } },
            manager: { select: { id: true, name: true, email: true } },
          },
          orderBy: { created_at: "desc" },
        }),
      ]);
    });
    results.push({
      modulo: "Mudanças",
      rota: "/changes",
      operacao: "Listagem de Mudanças (GMUD)",
      p50: m.p50,
      p95: m.p95,
      queries: 1,
      gargalo: "Leve",
      causa: "Consulta simples",
    });
  }

  // 11. Problemas (Problems)
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.problem.findMany({
          include: {
            assigned_to: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } },
          },
          orderBy: { created_at: "desc" },
        }),
      ]);
    });
    results.push({
      modulo: "Problemas",
      rota: "/problems",
      operacao: "Listagem de Problemas",
      p50: m.p50,
      p95: m.p95,
      queries: 1,
      gargalo: "Leve",
      causa: "Consulta simples",
    });
  }

  // 12. Usuários / Colaboradores (Users)
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.user.findMany({
          include: {
            department: true,
            role: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.department.findMany(),
        prisma.role.findMany(),
      ]);
    });
    results.push({
      modulo: "Usuários",
      rota: "/users",
      operacao: "Listagem de Colaboradores",
      p50: m.p50,
      p95: m.p95,
      queries: 3,
      gargalo: "Tabela completa com roles e setores",
      causa: "Sem paginação",
    });
  }

  // 13. Fornecedores (Suppliers)
  {
    const m = await measure(async () => {
      return Promise.all([
        prisma.supplier.findMany({
          orderBy: { name: "asc" },
        }),
      ]);
    });
    results.push({
      modulo: "Fornecedores",
      rota: "/suppliers",
      operacao: "Listagem de Fornecedores",
      p50: m.p50,
      p95: m.p95,
      queries: 1,
      gargalo: "Leve",
      causa: "Consulta simples",
    });
  }

  // 14. Configurações / Departamentos
  {
    const m = await measure(async () => {
      return prisma.department.findMany({
        include: { _count: { select: { users: true } } },
        orderBy: { name: "asc" },
      });
    });
    results.push({
      modulo: "Configurações / Setores",
      rota: "/settings/departments",
      operacao: "Listagem de Setores",
      p50: m.p50,
      p95: m.p95,
      queries: 1,
      gargalo: "Leve",
      causa: "Consulta simples",
    });
  }

  // 15. Configurações / Perfis (Roles)
  {
    const m = await measure(async () => {
      return prisma.role.findMany({
        include: { _count: { select: { users: true } } },
        orderBy: { name: "asc" },
      });
    });
    results.push({
      modulo: "Configurações / Perfis",
      rota: "/settings/roles",
      operacao: "Listagem de Perfis",
      p50: m.p50,
      p95: m.p95,
      queries: 1,
      gargalo: "Leve",
      causa: "Consulta simples",
    });
  }

  // Ordena do mais lento para o mais rápido (por P50)
  results.sort((a, b) => b.p50 - a.p50);

  console.log("------------------------------------------------------------------------------------------------------------------------");
  console.log(
    "RANKING DAS OPERAÇÕES (Da mais lenta para a mais rápida - Medições Reais em ms):"
  );
  console.log("------------------------------------------------------------------------------------------------------------------------");
  console.table(
    results.map((r, i) => ({
      Rank: `#${i + 1}`,
      Módulo: r.modulo,
      Rota: r.rota,
      "P50 (ms)": r.p50.toFixed(1),
      "P95 (ms)": r.p95.toFixed(1),
      "Nº Queries": r.queries,
      "Principal Gargalo": r.gargalo,
    }))
  );

  console.log("\n================================================================================");
  console.log(` OPERAÇÃO MAIS LENTA IDENTIFICADA: ${results[0].modulo} (${results[0].rota})`);
  console.log(` Tempo P50: ${results[0].p50.toFixed(1)}ms | P95: ${results[0].p95.toFixed(1)}ms`);
  console.log(` Causa: ${results[0].causa}`);
  console.log("================================================================================\n");
}

runBenchmark()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
