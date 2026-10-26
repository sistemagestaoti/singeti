const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
  `);
  console.log("Column assigned_to_name successfully added or verified in tickets table!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
