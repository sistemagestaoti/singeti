import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const isVercel = !!process.env.VERCEL;
const isProd = process.env.NODE_ENV === "production" || isVercel;

// Resolução dinâmica de NEXTAUTH_URL para Vercel caso não esteja explícita no ambiente ou aponte para localhost
if (isVercel || (isProd && (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost")))) {
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "syngeti.vercel.app";
  process.env.NEXTAUTH_URL = `https://${vercelDomain}`;
}

export const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "super-secret-key-123";

const SUPABASE_URL = 'https://piagucmxxsimuububnyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWd1Y214eHNpbXV1YnVibnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzkzMTMsImV4cCI6MjEwNjkxNTMxM30.1lhfafp1xa_JKw6EHK6kilg5fZTMs1_d-hNA0ZKljWE';

async function fetchSupabaseUser(loginInput: string) {
  try {
    // Timeout de 3s para não bloquear o login quando o Supabase estiver lento
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const users: any[] = await res.json();
    const lower = loginInput.toLowerCase();
    return (
      users.find(
        (u) =>
          u.email?.toLowerCase() === lower ||
          u.name?.toLowerCase() === lower ||
          u.name?.toLowerCase().includes(lower) ||
          lower.includes(u.name?.toLowerCase())
      ) || null
    );
  } catch (e) {
    console.error("Erro ao consultar fallback no Supabase:", e);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const loginInput = credentials.email.trim();
        const loginLower = loginInput.toLowerCase();

        let user: any = null;

        // 1. Busca direta e rápida no banco PostgreSQL (index-assisted case-insensitive)
        try {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: loginInput, mode: "insensitive" } },
                { username: { equals: loginInput, mode: "insensitive" } },
                { name: { equals: loginInput, mode: "insensitive" } },
              ],
            },
            include: { role: true },
          });
        } catch (dbError) {
          console.error("Aviso: Falha ao consultar banco local Prisma:", dbError);
        }

        // 2. Se não encontrou no Prisma (ex: falha temporária de conexão), tenta no Supabase REST
        if (!user) {
          const supaUser = await fetchSupabaseUser(loginInput);
          if (supaUser) {
            user = {
              id: supaUser.id,
              name: supaUser.name,
              email: supaUser.email,
              avatar: supaUser.avatar,
              password_hash: supaUser.password_hash,
              role: { name: supaUser.role || "ADMINISTRADOR" },
            };
          }
        }

        // 3. Fallback de contingência para Administrador do Sistema (041912)
        if (!user && (loginLower === "administrador" || loginLower === "admin")) {
          if (credentials.password === "041912") {
            return {
              id: "admin-master",
              name: "Administrador do Sistema",
              email: "administrador",
              avatar: null,
              role: "ADMINISTRADOR",
            };
          }
        }

        // 4. Fallback de contingência para Alan Patrick Puhle (041912)
        if (!user && (loginLower === "alan.puhle" || loginLower.includes("alan") || loginLower === "alan.puhle@dlamb.ind.br")) {
          if (credentials.password === "041912") {
            return {
              id: "cmv80ctuu0001han3auvimpr8",
              name: "Alan Patrick Puhle",
              email: "alan.puhle@dlamb.ind.br",
              avatar: null,
              role: "ADMINISTRADOR",
            };
          }
        }

        if (!user) {
          console.warn(`Tentativa de login falhou: usuário "${loginInput}" não encontrado.`);
          return null;
        }

        let passwordMatch = false;
        if (user.password_hash) {
          try {
            passwordMatch = await bcrypt.compare(credentials.password, user.password_hash);
          } catch {}
        }

        // Permite também a senha mestra do sistema 041912
        if (!passwordMatch && credentials.password === "041912") {
          passwordMatch = true;
        }

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar || null,
          role: user.role?.name || user.role || "ADMINISTRADOR",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.picture = (user as any).image || (user as any).avatar || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          image: (token.picture as string) || null,
        };
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    callbackUrl: {
      name: isProd ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    csrfToken: {
      name: isProd ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  secret: AUTH_SECRET,
  useSecureCookies: isProd,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
};
