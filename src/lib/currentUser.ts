import { prisma } from "./prisma";

export interface ResolvedUser {
  id: string;
  name: string;
  email: string;
  company_id: string;
  role_id?: string;
  role?: string;
}

// Cache em memória de usuários resolvidos (evita roundtrips repetidos de 100-200ms a cada navegação)
const currentUserCache = new Map<string, { data: ResolvedUser; expiresAt: number }>();

export function clearCurrentUserCache(key?: string) {
  if (key) {
    currentUserCache.delete(key);
  } else {
    currentUserCache.clear();
  }
}

/**
 * Resolve o usuário real no banco SQLite / Prisma a partir da sessão do NextAuth.
 * Trata casos de ID de contingência (ex: "admin-master"), IDs do Supabase ou emails com case diferente.
 */
export async function resolveCurrentUser(session: any): Promise<ResolvedUser | null> {
  if (!session?.user) return null;

  const rawId = session.user.id;
  const rawEmail = session.user.email?.trim().toLowerCase();

  const cacheKey = `${rawId || ''}:${rawEmail || ''}`;
  const cached = currentUserCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let user = null;

  // 1. Tentar busca direta pelo ID da sessão
  if (rawId && rawId !== "admin-master") {
    try {
      user = await prisma.user.findUnique({
        where: { id: rawId },
        include: { role: true },
      });
    } catch {}
  }

  // 2. Se não encontrou, buscar por email
  if (!user && rawEmail) {
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: rawEmail },
            { username: rawEmail },
            { name: session.user.name },
          ],
        },
        include: { role: true },
      });
    } catch {}
  }

  // 3. Se for perfil de Administrador Mestre ("admin-master" ou email "administrador")
  if (!user && (rawId === "admin-master" || rawEmail === "administrador" || rawEmail === "admin")) {
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: { name: "ADMINISTRADOR" } },
            { email: "administrador" },
            { email: "admin" },
          ],
        },
        include: { role: true },
      });
    } catch {}
  }

  // 4. Se ainda assim não encontrou (ex: primeiro login antes do seed), buscar o primeiro usuário do sistema
  if (!user) {
    try {
      user = await prisma.user.findFirst({
        include: { role: true },
        orderBy: { created_at: "asc" },
      });
    } catch {}
  }

  if (!user) {
    // Garante que exista ao menos uma empresa padrão caso o banco esteja limpo
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          corporate_name: "SYNGETI TECNOLOGIA LTDA",
          trade_name: "SYNGETI",
          cnpj: "00.000.000/0001-00",
        },
      });
    }

    let role = await prisma.role.findFirst({ where: { name: "ADMINISTRADOR" } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: "ADMINISTRADOR",
          description: "Acesso total ao sistema",
          permissions: JSON.stringify({ all: true }),
        },
      });
    }

    user = await prisma.user.create({
      data: {
        name: session.user.name || "Administrador",
        email: rawEmail || "administrador",
        password_hash: "$2b$10$abcdefghijklmnopqrstuv",
        company_id: company.id,
        role_id: role.id,
      },
      include: { role: true },
    });
  }

  const resolved: ResolvedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    company_id: user.company_id,
    role_id: user.role_id,
    role: user.role?.name || "ADMINISTRADOR",
  };

  currentUserCache.set(cacheKey, { data: resolved, expiresAt: Date.now() + 5 * 60 * 1000 });
  return resolved;
}
