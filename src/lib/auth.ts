import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SUPABASE_URL = 'https://piagucmxxsimuububnyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWd1Y214eHNpbXV1YnVibnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzkzMTMsImV4cCI6MjEwNjkxNTMxM30.1lhfafp1xa_JKw6EHK6kilg5fZTMs1_d-hNA0ZKljWE';

async function fetchSupabaseUser(loginInput: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
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

        // 1. Tenta buscar no banco principal via Prisma
        try {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: loginLower },
                { email: loginInput },
                { name: loginInput },
              ],
            },
            include: { role: true },
          });

          // Fallback case-insensitive amplo e por primeiro nome / sobrenome
          if (!user) {
            const allUsers = await prisma.user.findMany({ include: { role: true } });
            user =
              allUsers.find(
                (u) =>
                  u.email.toLowerCase() === loginLower ||
                  u.name.toLowerCase() === loginLower ||
                  u.name.toLowerCase().includes(loginLower) ||
                  loginLower.includes(u.name.toLowerCase())
              ) || null;
          }
        } catch (dbError) {
          console.error("Aviso: Falha ao consultar banco local Prisma:", dbError);
        }

        // 2. Se não encontrou no Prisma (ou deu erro no SQLite), tenta no Supabase
        if (!user) {
          const supaUser = await fetchSupabaseUser(loginInput);
          if (supaUser) {
            user = {
              id: supaUser.id,
              name: supaUser.name,
              email: supaUser.email,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
