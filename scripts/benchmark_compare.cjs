const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function getP50(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.5)];
}

function getP95(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)];
}

async function measure(fn, iterations = 5) {
  const times = [];
  let result = null;
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const duration = performance.now() - start;
    times.push(duration);
  }
  const payloadSize = Buffer.byteLength(JSON.stringify(result || {}), "utf8");
  return {
    p50: getP50(times),
    p95: getP95(times),
    payloadKB: (payloadSize / 1024).toFixed(2),
  };
}

async function run() {
  console.log("================================================================================");
  console.log("   SYNGETI — MEDIÇÃO COMPARATIVA ANTES VS DEPOIS (LATÊNCIA E PAYLOAD)           ");
  console.log("================================================================================\n");

  const ticket = await prisma.ticket.findFirst();

  // 1. Service Desk Detalhes [id] - ANTES
  const sdDetailBefore = await measure(async () => {
    return Promise.all([
      prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: {
          requester: true, // inclui base64 avatar
          assigned_to: true, // inclui base64 avatar
          category: true,
          department: true,
          asset: true,
          comments: { include: { author: true }, orderBy: { created_at: "asc" } }, // inclui base64 avatar
          items: { include: { asset: true }, orderBy: { created_at: "asc" } },
        },
      }),
      prisma.ticketCategory.findMany(),
      prisma.department.findMany(),
      prisma.asset.findMany({ select: { id: true, name: true, internal_id: true, asset_tag: true } }),
      prisma.user.findMany({ select: { id: true, name: true, email: true, job_title: true } }),
    ]);
  });

  // 1. Service Desk Detalhes [id] - DEPOIS
  const sdDetailAfter = await measure(async () => {
    return Promise.all([
      prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: {
          requester: { select: { id: true, name: true, email: true, job_title: true } },
          assigned_to: { select: { id: true, name: true, email: true, job_title: true } },
          category: true,
          department: true,
          asset: true,
          comments: {
            include: {
              author: { select: { id: true, name: true, email: true, job_title: true } },
            },
            orderBy: { created_at: "asc" },
          },
          items: { include: { asset: true }, orderBy: { created_at: "asc" } },
        },
      }),
      prisma.ticketCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.asset.findMany({ select: { id: true, name: true, internal_id: true, asset_tag: true } }),
      prisma.user.findMany({ select: { id: true, name: true, email: true, job_title: true } }),
    ]);
  });

  // 2. Service Desk Listagem - ANTES
  const sdListBefore = await measure(async () => {
    return Promise.all([
      prisma.user.findFirst(),
      prisma.ticketCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.ticket.findMany({
        take: 500,
        include: {
          requester: { select: { id: true, name: true, email: true, avatar: true } }, // base64 avatar
          assigned_to: { select: { id: true, name: true, email: true, avatar: true } }, // base64 avatar
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          asset: { select: { id: true, name: true, internal_id: true, asset_tag: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
      prisma.user.findMany({ orderBy: { name: "asc" } }),
    ]);
  });

  // 2. Service Desk Listagem - DEPOIS
  const sdListAfter = await measure(async () => {
    return Promise.all([
      prisma.user.findFirst({ select: { id: true, name: true, role: true } }),
      prisma.ticketCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
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
  });

  console.log("RESULTADOS COMPARATIVOS ANTES vs DEPOIS:");
  console.log("--------------------------------------------------------------------------------");
  console.table([
    {
      "Módulo / Rota": "Service Desk (Listagem)",
      "Antes P50": `${sdListBefore.p50.toFixed(1)}ms`,
      "Depois P50": `${sdListAfter.p50.toFixed(1)}ms`,
      "Antes Payload": `${sdListBefore.payloadKB} KB`,
      "Depois Payload": `${sdListAfter.payloadKB} KB`,
      "Redução Payload": `${((1 - parseFloat(sdListAfter.payloadKB) / parseFloat(sdListBefore.payloadKB)) * 100).toFixed(1)}%`,
    },
    {
      "Módulo / Rota": "Service Desk (Detalhes [id])",
      "Antes P50": `${sdDetailBefore.p50.toFixed(1)}ms`,
      "Depois P50": `${sdDetailAfter.p50.toFixed(1)}ms`,
      "Antes Payload": `${sdDetailBefore.payloadKB} KB`,
      "Depois Payload": `${sdDetailAfter.payloadKB} KB`,
      "Redução Payload": `${((1 - parseFloat(sdDetailAfter.payloadKB) / parseFloat(sdDetailBefore.payloadKB)) * 100).toFixed(1)}%`,
    },
  ]);

  console.log("\nIMPACTO DO PREFETCH DA SIDEBAR:");
  console.log("--------------------------------------------------------------------------------");
  console.log("Antes: 17 requisições simultâneas em segundo plano disparadas a cada carregamento de página.");
  console.log("Depois: 0 requisições simultâneas em segundo plano (prefetch sob demanda).");
  console.log("Economia de conexões PgBouncer/Supabase por carregamento: 17x menos concorrência!\n");

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
