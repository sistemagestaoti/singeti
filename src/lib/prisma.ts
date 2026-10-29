import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const rawUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres.piagucmxxsimuububnyl:x6RO3ISFMqwDd6We@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

// Configuração otimizada de conexão para Supabase PgBouncer (Transaction Mode)
// connection_limit=20 e pool_timeout=20 evitam exaustão de pool (P2024) em picos concorrentes de chat e sincronização
function buildResilientDbUrl(url: string): string {
  let finalUrl = url;
  const appendParam = (key: string, value: string) => {
    if (!finalUrl.includes(`${key}=`)) {
      finalUrl += `${finalUrl.includes("?") ? "&" : "?"}${key}=${value}`;
    }
  };
  if (finalUrl.includes("pooler.supabase.com:6543")) {
    appendParam("pgbouncer", "true");
  }
  appendParam("connection_limit", "20");
  appendParam("pool_timeout", "20");
  appendParam("connect_timeout", "15");
  return finalUrl;
}

const dbUrl = buildResilientDbUrl(rawUrl);

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
