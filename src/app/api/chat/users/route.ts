import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUserOnline, getUserLastSeen, recordUserPresence } from "@/lib/presence";

const SUPABASE_URL = 'https://piagucmxxsimuububnyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWd1Y214eHNpbXV1YnVibnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzkzMTMsImV4cCI6MjEwNjkxNTMxM30.1lhfafp1xa_JKw6EHK6kilg5fZTMs1_d-hNA0ZKljWE';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const currentUserEmail = session.user.email?.toLowerCase();

    // Registra presença ativa do usuário autenticado no Connect Chat
    recordUserPresence(currentUserId, session.user.name || undefined, currentUserEmail || undefined);

    // 1. Buscar todos os usuários do banco de dados Prisma
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        job_title: true,
        status: true,
        last_seen_at: true,
      },
      orderBy: { name: "asc" }
    });

    const userMap = new Map<string, any>();

    for (const u of prismaUsers) {
      userMap.set(u.email.toLowerCase(), {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        job_title: u.job_title,
        status: u.status,
        last_seen_at: u.last_seen_at,
      });
    }

    // 3. Montar lista excluindo o usuário logado e calculando status de presença online/offline
    const allUsers = Array.from(userMap.values())
      .filter(u => {
        const isMeById = u.id === currentUserId;
        const isMeByEmail = currentUserEmail && u.email.toLowerCase() === currentUserEmail;
        return !isMeById && !isMeByEmail;
      })
      .map(u => {
        const online = isUserOnline(u.id, u.email, u.last_seen_at);
        const lastSeen = getUserLastSeen(u.id, u.email, u.last_seen_at);
        return {
          ...u,
          isOnline: online,
          lastSeen,
        };
      });

    // Ordenar: Online primeiro, depois por nome
    allUsers.sort((a, b) => {
      if (a.isOnline === b.isOnline) {
        return a.name.localeCompare(b.name);
      }
      return a.isOnline ? -1 : 1;
    });

    return NextResponse.json({
      users: allUsers,
      onlineCount: allUsers.filter(u => u.isOnline).length,
      totalCount: allUsers.length,
    });
  } catch (error: any) {
    console.error("GET /api/chat/users error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
