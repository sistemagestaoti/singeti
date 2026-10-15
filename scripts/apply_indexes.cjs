// Script de migração segura para criação de índices essenciais no Supabase PostgreSQL
// Utiliza "CREATE INDEX IF NOT EXISTS" de forma puramente não-destrutiva
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const indexesToCreate = [
  // 1. CHAT (Maior volume de leituras e seq_scans reportados: 7.260 seq_scans)
  {
    table: 'chat_messages',
    name: 'idx_chat_messages_channel_created',
    sql: 'CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON chat_messages (channel_id, created_at ASC);'
  },
  {
    table: 'chat_messages',
    name: 'idx_chat_messages_unread_sync',
    sql: 'CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_sync ON chat_messages (is_read, sender_id);'
  },
  {
    table: 'chat_channels',
    name: 'idx_chat_channels_updated_at',
    sql: 'CREATE INDEX IF NOT EXISTS idx_chat_channels_updated_at ON chat_channels (updated_at DESC);'
  },

  // 2. TICKETS & SERVICE DESK (264 seq scans, deep includes, consultas frequentes)
  {
    table: 'tickets',
    name: 'idx_tickets_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);'
  },
  {
    table: 'tickets',
    name: 'idx_tickets_requester',
    sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets (requester_id);'
  },
  {
    table: 'tickets',
    name: 'idx_tickets_assigned',
    sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets (assigned_to_id);'
  },
  {
    table: 'tickets',
    name: 'idx_tickets_company',
    sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_company ON tickets (company_id);'
  },
  {
    table: 'tickets',
    name: 'idx_tickets_created_at',
    sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets (created_at DESC);'
  },
  {
    table: 'ticket_comments',
    name: 'idx_ticket_comments_ticket_created',
    sql: 'CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_created ON ticket_comments (ticket_id, created_at ASC);'
  },
  {
    table: 'ticket_items',
    name: 'idx_ticket_items_ticket_created',
    sql: 'CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket_created ON ticket_items (ticket_id, created_at ASC);'
  },

  // 3. CMDB / ATIVOS (Inventário de TI)
  {
    table: 'assets',
    name: 'idx_assets_company',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assets_company ON assets (company_id);'
  },
  {
    table: 'assets',
    name: 'idx_assets_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assets_status ON assets (status);'
  },
  {
    table: 'assets',
    name: 'idx_assets_department',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assets_department ON assets (department_id);'
  },
  {
    table: 'assets',
    name: 'idx_assets_created_at',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets (created_at DESC);'
  },

  // 4. USUÁRIOS
  {
    table: 'users',
    name: 'idx_users_role',
    sql: 'CREATE INDEX IF NOT EXISTS idx_users_role ON users (role_id);'
  },
  {
    table: 'users',
    name: 'idx_users_company',
    sql: 'CREATE INDEX IF NOT EXISTS idx_users_company ON users (company_id);'
  },
  {
    table: 'users',
    name: 'idx_users_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);'
  }
];

async function applyIndexes() {
  console.log('=== APLICAÇÃO SEGURA DE ÍNDICES ESSENCIAIS ===\n');
  let createdCount = 0;

  for (const item of indexesToCreate) {
    try {
      console.log(`Aplicando índice [${item.name}] na tabela [${item.table}]...`);
      await prisma.$executeRawUnsafe(item.sql);
      console.log(`  ✅ Sucesso: ${item.name}`);
      createdCount++;
    } catch (err) {
      console.error(`  ❌ Erro ao criar índice ${item.name}:`, err.message);
    }
  }

  console.log(`\nFinalizado: ${createdCount} de ${indexesToCreate.length} índices verificados/criados.`);
  await prisma.$disconnect();
}

applyIndexes().catch(console.error);
