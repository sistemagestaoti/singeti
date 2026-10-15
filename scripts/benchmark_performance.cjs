// Performance Benchmark Script - SYNGETI
// Mede tempos reais de queries Prisma, simulando operações críticas do sistema
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });

const results = [];

function ms(start) {
  const diff = process.hrtime.bigint() - start;
  return Number(diff) / 1e6; // nanoseconds → milliseconds
}

async function benchmark(label, fn) {
  // Warm up
  try { await fn(); } catch {}
  
  const times = [];
  for (let i = 0; i < 5; i++) {
    const start = process.hrtime.bigint();
    try {
      await fn();
    } catch (e) {
      console.error(`  ⚠️ ${label}: ${e.message}`);
      break;
    }
    times.push(ms(start));
  }
  
  if (times.length > 0) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const result = { label, avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2), runs: times.length };
    results.push(result);
    const flag = avg > 200 ? '🔴 LENTO' : avg > 50 ? '🟡 MODERADO' : '🟢 RÁPIDO';
    console.log(`  ${flag} ${label}: avg=${avg.toFixed(1)}ms min=${min.toFixed(1)}ms max=${max.toFixed(1)}ms`);
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  BENCHMARK DE PERFORMANCE - SYNGETI');
  console.log('='.repeat(70) + '\n');

  // 1. Conexão inicial
  console.log('--- 1. CONEXÃO COM BANCO DE DADOS ---');
  const connStart = process.hrtime.bigint();
  await prisma.$queryRaw`SELECT 1`;
  console.log(`  Primeira conexão: ${ms(connStart).toFixed(1)}ms\n`);

  // 2. Queries simples
  console.log('--- 2. QUERIES SIMPLES (COUNT) ---');
  await benchmark('COUNT users', () => prisma.user.count());
  await benchmark('COUNT tickets', () => prisma.ticket.count());
  await benchmark('COUNT assets', () => prisma.asset.count());
  await benchmark('COUNT companies', () => prisma.company.count());
  await benchmark('COUNT ticket_comments', () => prisma.ticketComment.count());
  await benchmark('COUNT ticket_items', () => prisma.ticketItem.count());
  await benchmark('COUNT messages', () => prisma.message.count());
  await benchmark('COUNT conversations', () => prisma.conversation.count());
  await benchmark('COUNT departments', () => prisma.department.count());
  await benchmark('COUNT roles', () => prisma.role.count());

  // 3. Listagens com includes (simula carregamento de páginas)
  console.log('\n--- 3. LISTAGENS COM INCLUDES (SIMULAÇÃO DE PÁGINAS) ---');
  
  await benchmark('DASHBOARD: tickets count + assets count', async () => {
    await Promise.all([
      prisma.ticket.count(),
      prisma.asset.count(),
      prisma.user.count(),
      prisma.ticket.count({ where: { status: 'NEW' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    ]);
  });

  await benchmark('SERVICE-DESK: findMany tickets + includes', async () => {
    await prisma.ticket.findMany({
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assigned_to: { select: { id: true, name: true } },
        category: true,
        items: true,
      },
      orderBy: { created_at: 'desc' },
    });
  });

  await benchmark('CMDB/INVENTÁRIO: findMany assets + includes', async () => {
    await prisma.asset.findMany({
      include: {
        company: true,
        department: true,
      },
      orderBy: { created_at: 'desc' },
    });
  });

  await benchmark('TICKET DETALHES: findUnique + deep include', async () => {
    const first = await prisma.ticket.findFirst({ select: { id: true } });
    if (first) {
      await prisma.ticket.findUnique({
        where: { id: first.id },
        include: {
          requester: true,
          assigned_to: true,
          category: true,
          asset: true,
          department: true,
          items: { include: { asset: true }, orderBy: { created_at: 'asc' } },
          comments: { include: { author: true }, orderBy: { created_at: 'asc' } },
        },
      });
    }
  });

  await benchmark('CONNECT: findMany conversations + includes', async () => {
    await prisma.conversation.findMany({
      include: {
        participants: { include: { user: true } },
        messages: { take: 1, orderBy: { created_at: 'desc' } },
      },
    });
  });

  await benchmark('USERS: findMany users + role', async () => {
    await prisma.user.findMany({
      include: { role: true, department: true, company: true },
    });
  });

  // 4. Queries filtradas
  console.log('\n--- 4. QUERIES FILTRADAS ---');
  
  await benchmark('Tickets por status (WHERE status)', async () => {
    await prisma.ticket.findMany({ where: { status: 'IN_PROGRESS' } });
  });

  await benchmark('Tickets por requester_id', async () => {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (user) await prisma.ticket.findMany({ where: { requester_id: user.id } });
  });

  await benchmark('Assets por company_id', async () => {
    const co = await prisma.company.findFirst({ select: { id: true } });
    if (co) await prisma.asset.findMany({ where: { company_id: co.id } });
  });

  await benchmark('Messages por conversation_id', async () => {
    const conv = await prisma.conversation.findFirst({ select: { id: true } });
    if (conv) await prisma.message.findMany({ where: { conversation_id: conv.id }, orderBy: { created_at: 'asc' } });
  });

  // 5. Queries de busca textual
  console.log('\n--- 5. QUERIES DE BUSCA ---');
  
  await benchmark('Busca ticket por título (LIKE)', async () => {
    await prisma.ticket.findMany({ where: { title: { contains: 'monitor', mode: 'insensitive' } } });
  });

  await benchmark('Busca asset por nome (LIKE)', async () => {
    await prisma.asset.findMany({ where: { name: { contains: 'notebook', mode: 'insensitive' } } });
  });

  // 6. Raw SQL para verificar explain plans
  console.log('\n--- 6. EXPLAIN ANALYZE (queries mais pesadas) ---');
  
  try {
    const explain1 = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE SELECT * FROM tickets ORDER BY created_at DESC`);
    console.log('  EXPLAIN tickets ORDER BY created_at DESC:');
    explain1.forEach(r => console.log('    ' + r['QUERY PLAN']));
  } catch (e) {
    console.log('  ⚠️ EXPLAIN não disponível: ' + e.message);
  }

  try {
    const explain2 = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE SELECT * FROM assets ORDER BY created_at DESC`);
    console.log('  EXPLAIN assets ORDER BY created_at DESC:');
    explain2.forEach(r => console.log('    ' + r['QUERY PLAN']));
  } catch (e) {}

  try {
    const explain3 = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id = (SELECT id FROM conversations LIMIT 1) ORDER BY created_at ASC`);
    console.log('  EXPLAIN messages WHERE conversation_id:');
    explain3.forEach(r => console.log('    ' + r['QUERY PLAN']));
  } catch (e) {}

  // 7. Pool stats
  console.log('\n--- 7. ESTATÍSTICAS DO BANCO ---');
  try {
    const tableStats = await prisma.$queryRawUnsafe(`
      SELECT relname AS table, n_live_tup AS row_count, seq_scan, idx_scan
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20
    `);
    console.log('  Tabela               | Rows     | Seq Scans | Idx Scans');
    console.log('  ' + '-'.repeat(65));
    tableStats.forEach(t => {
      console.log(`  ${String(t.table).padEnd(22)}| ${String(t.row_count).padEnd(9)}| ${String(t.seq_scan).padEnd(10)}| ${t.idx_scan}`);
    });
  } catch (e) {
    console.log('  ⚠️ pg_stat não disponível: ' + e.message);
  }

  // 8. Verificar índices existentes
  console.log('\n--- 8. ÍNDICES EXISTENTES NO BANCO ---');
  try {
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    let currentTable = '';
    indexes.forEach(idx => {
      if (idx.tablename !== currentTable) {
        currentTable = idx.tablename;
        console.log(`\n  📋 ${currentTable}:`);
      }
      console.log(`    → ${idx.indexname}`);
    });
  } catch (e) {
    console.log('  ⚠️ pg_indexes não disponível: ' + e.message);
  }

  // RESUMO
  console.log('\n\n' + '='.repeat(70));
  console.log('  RESUMO DE PERFORMANCE');
  console.log('='.repeat(70));
  console.log('\n  Label                                          | Avg (ms) | Status');
  console.log('  ' + '-'.repeat(65));
  results.forEach(r => {
    const flag = parseFloat(r.avg) > 200 ? '🔴 LENTO' : parseFloat(r.avg) > 50 ? '🟡' : '🟢';
    console.log(`  ${r.label.padEnd(49)}| ${r.avg.padStart(8)} | ${flag}`);
  });

  console.log('\n');
  await prisma['$disconnect']();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
