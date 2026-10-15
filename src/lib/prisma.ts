import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const rawUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres.piagucmxxsimuububnyl:x6RO3ISFMqwDd6We@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

// Configuração otimizada de conexão para Supabase PgBouncer (Transaction Mode)
// connection_limit=10 permite que consultas paralelas (Promise.all) rodem simultaneamente sem fila
const dbUrl = rawUrl.includes("connection_limit")
  ? rawUrl
  : `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}connection_limit=10&pool_timeout=10`;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: ['error', 'warn'],
  });

globalForPrisma.prisma = prisma;
