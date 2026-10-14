import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUserOnline, getUserLastSeen } from "@/lib/presence";

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

    // 1. Buscar todos os usuários do banco de dados Prisma
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        job_title: true,
        status: true,
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
      });
    }

    // 2. Buscar também no Supabase caso haja usuários registrados lá
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        cache: "no-store",
      });

      if (res.ok) {
        const supaUsers: any[] = await res.json();
        for (const su of supaUsers) {
          const email = (su.email || "").toLowerCase();
          if (!email) continue;
          if (!userMap.has(email)) {
            userMap.set(email, {
              id: su.id,
              name: su.name,
              email: su.email,
              avatar: su.avatar || null,
              job_title: su.job_title || su.role || "Usuário",
              status: su.status || "ACTIVE",
            });
          }
        }
      }
    } catch (e) {
      // Ignora falha de rede externa no Supabase
    }

    // 3. Montar lista excluindo o usuário logado e calculando status de presença online/offline
    const allUsers = Array.from(userMap.values())
      .filter(u => {
        const isMeById = u.id === currentUserId;
        const isMeByEmail = currentUserEmail && u.email.toLowerCase() === currentUserEmail;
        return !isMeById && !isMeByEmail;
      })
      .map(u => {
        const online = isUserOnline(u.id, u.email);
        const lastSeen = getUserLastSeen(u.id, u.email);
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
