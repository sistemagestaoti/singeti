const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== APLICANDO ESTRUTURA PARA CADASTROS INTELIGENTES NO BANCO ===\n');

  try {
    // 1. Adicionar requester_name na tabela tickets
    console.log('[1/3] Verificando/adicionando coluna requester_name em tickets...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS requester_name TEXT;
    `);
    console.log(' Coluna requester_name pronta em tickets.');

    // 2. Criar tabela requesters (para solicitantes sem obrigatoriedade de conta de login)
    console.log('\n[2/3] Verificando/criando tabela requesters...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS requesters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        job_title TEXT,
        department_name TEXT,
        company_id TEXT,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_requesters_name ON requesters(name);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_requesters_company ON requesters(company_id);
    `);
    console.log(' Tabela requesters pronta.');

    // 3. Criar tabela item_catalog (para catálogo reutilizável de peças/materiais de chamados)
    console.log('\n[3/3] Verificando/criando tabela item_catalog...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS item_catalog (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        unit TEXT DEFAULT 'UN',
        category TEXT,
        notes TEXT,
        company_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_item_catalog_name ON item_catalog(name);
    `);
    console.log(' Tabela item_catalog pronta.');

    console.log('\n BANCO DE DADOS ATUALIZADO COM SUCESSO!');
  } catch (err) {
    console.error('❌ Erro ao atualizar banco:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
