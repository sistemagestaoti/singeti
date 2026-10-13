import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function getDatasourceUrl(): string | undefined {
  // Em ambientes Serverless (Vercel / AWS Lambda), o sistema de arquivos principal é READ-ONLY.
  // O SQLite precisa de acesso de gravação para criar locks e journals.
  // O único diretório gravável na Lambda é o /tmp.
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

  if (isServerless) {
    const tmpDb = '/tmp/sqlite.db';

    if (!fs.existsSync(/*turbopackIgnore: true*/ tmpDb)) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'sqlite.db'),
        path.join(process.cwd(), 'sqlite.db'),
        '/var/task/prisma/sqlite.db',
        '/var/task/sqlite.db',
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
          try {
            fs.copyFileSync(candidate, tmpDb);
            console.log(`[Prisma] Banco SQLite copiado com sucesso de ${candidate} para ${tmpDb}`);
            break;
          } catch (e) {
            console.error(`[Prisma] Falha ao copiar banco de ${candidate}:`, e);
          }
        }
      }
    }

    if (fs.existsSync(/*turbopackIgnore: true*/ tmpDb)) {
      return `file:${tmpDb}`;
    }
  }

  return undefined;
}

const dbUrl = getDatasourceUrl();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
