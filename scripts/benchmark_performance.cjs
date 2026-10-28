const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runBenchmark() {
  console.log("=== BENCHMARK DE PERFORMANCE SYNGETI ===");
  console.log("Data/Hora:", new Date().toISOString());

  // 1. Dashboard queries
  const dashStart = performance.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    chamadosAbertos,
    emAtendimento,
    chamadosResolvidos,
    resolvidosHoje,
    equipamentosAtivos,
    ticketsByCategory,
    categories,
    ultimosChamados,
    equipamentosRecentes,
  ] = await Promise.all([
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
  const dashDuration = performance.now() - dashStart;
  console.log(`[Dashboard] Consultas paralelas concluídas em: ${dashDuration.toFixed(2)} ms`);

  // 2. Service Desk queries
  const sdStart = performance.now();
  const [sdCats, sdTickets, sdDepts, sdAttendants] = await Promise.all([
    prisma.ticketCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.ticket.findMany({
      take: 100,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assigned_to: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true, internal_id: true, asset_tag: true } },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);
  const sdDuration = performance.now() - sdStart;
  console.log(`[Service Desk] Consultas paralelas concluídas em: ${sdDuration.toFixed(2)} ms (Total chamados: ${sdTickets.length})`);

  // 3. CMDB queries
  const cmdbStart = performance.now();
  const [cmdbAssets, cmdbCount] = await Promise.all([
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
  const cmdbDuration = performance.now() - cmdbStart;
  console.log(`[CMDB] Consultas concluídas em: ${cmdbDuration.toFixed(2)} ms (Total ativos: ${cmdbCount})`);

  // 4. PC Access queries
  const pcStart = performance.now();
  const [computers, totalPcs, totalEmails, totalCollabs] = await Promise.all([
    prisma.computer.findMany({
      take: 15,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            status: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    }),
    prisma.computer.count(),
    prisma.pcEmailAccount.count(),
    prisma.pcCollaborator.count(),
  ]);
  const pcDuration = performance.now() - pcStart;
  console.log(`[Gestão de Acessos] Consultas concluídas em: ${pcDuration.toFixed(2)} ms (PCs: ${totalPcs}, E-mails: ${totalEmails}, Colaboradores: ${totalCollabs})`);

  // 5. Comparativo: Novo Chamado (SEQUENCIAL vs PARALELO)
  console.log("\n--- TESTE ESPECÍFICO: NOVO CHAMADO (Sequential vs Parallel) ---");
  
  // Modo Sequencial (como estava no código original):
  const seqStart = performance.now();
  const seq1 = await prisma.ticketCategory.findMany({ orderBy: { name: "asc" } });
  const seq2 = await prisma.asset.findMany({ select: { id: true, name: true, internal_id: true, asset_tag: true, type: true, status: true }, orderBy: { name: "asc" } });
  const seq3 = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const seq4 = await prisma.user.findMany({ select: { id: true, name: true, email: true, job_title: true, department: { select: { id: true, name: true } } }, orderBy: { name: "asc" } });
  const seqDuration = performance.now() - seqStart;
  console.log(`[Novo Chamado - SEQUENCIAL (Antes)]: ${seqDuration.toFixed(2)} ms`);

  // Modo Paralelo (otimizado com Promise.all):
  const parStart = performance.now();
  const [par1, par2, par3, par4] = await Promise.all([
    prisma.ticketCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.asset.findMany({ select: { id: true, name: true, internal_id: true, asset_tag: true, type: true, status: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, job_title: true, department: { select: { id: true, name: true } } }, orderBy: { name: "asc" } }),
  ]);
  const parDuration = performance.now() - parStart;
  console.log(`[Novo Chamado - PARALELO (Depois)]: ${parDuration.toFixed(2)} ms`);
  console.log(`-> Redução de latência de abertura: ${((seqDuration - parDuration) / seqDuration * 100).toFixed(1)}%`);

  await prisma.$disconnect();
}

runBenchmark().catch((e) => {
  console.error("Erro no benchmark:", e);
  process.exit(1);
});
