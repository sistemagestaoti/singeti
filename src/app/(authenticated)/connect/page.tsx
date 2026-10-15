import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "./ChatInterface";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ConnectPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  let dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, avatar: true }
  });

  if (!dbUser && session.user.email) {
    dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, avatar: true }
    });
  }

  const currentUser = dbUser || {
    id: session.user.id,
    name: session.user.name || "Usuário",
    avatar: null
  };

  // Marcar presença do usuário logado
  const { recordUserPresence, isUserOnline, getUserLastSeen } = await import("@/lib/presence");
  recordUserPresence(session.user.id, session.user.name || undefined, session.user.email || undefined);

  const currentUserId = currentUser.id;
  const currentUserEmail = session.user.email?.toLowerCase();

  // Fetch all other users from Prisma
  const prismaUsers = await prisma.user.findMany({
    select: { 
      id: true, 
      name: true, 
      email: true, 
      avatar: true,
      job_title: true,
      status: true
    },
    orderBy: { name: 'asc' }
  });

  const userMap = new Map<string, any>();
  for (const u of prismaUsers) {
    userMap.set(u.email.toLowerCase(), { ...u });
  }

  // Tentar unificar com usuários cadastrados no Supabase
  try {
    const SUPABASE_URL = 'https://piagucmxxsimuububnyl.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWd1Y214eHNpbXV1YnVibnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzkzMTMsImV4cCI6MjEwNjkxNTMxM30.1lhfafp1xa_JKw6EHK6kilg5fZTMs1_d-hNA0ZKljWE';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const supaUsers: any[] = await res.json();
      for (const su of supaUsers) {
        const email = (su.email || "").toLowerCase();
        if (email && !userMap.has(email)) {
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
  } catch {}

  const users = Array.from(userMap.values())
    .filter(u => {
      const isMeById = u.id === currentUserId || u.id === session.user.id;
      const isMeByEmail = currentUserEmail && u.email.toLowerCase() === currentUserEmail;
      return !isMeById && !isMeByEmail;
    })
    .map(u => ({
      ...u,
      isOnline: isUserOnline(u.id, u.email),
      lastSeen: getUserLastSeen(u.id, u.email),
    }));

  users.sort((a, b) => {
    if (a.isOnline === b.isOnline) return a.name.localeCompare(b.name);
    return a.isOnline ? -1 : 1;
  });

  // Ensure there's a global "Geral" channel
  let mainChannel = await prisma.chatChannel.findFirst({
    where: { name: "Geral" }
  });

  if (!mainChannel) {
    mainChannel = await prisma.chatChannel.create({
      data: { name: "Geral", is_group: true }
    });
  }

  // Fetch team channels and DM channels where current user is a participant
  const channels = await prisma.chatChannel.findMany({
    where: {
      OR: [
        { is_group: true },
        { members: { some: { id: currentUser.id } } }
      ]
    },
    include: {
      members: {
        select: { id: true, name: true, avatar: true, email: true, job_title: true }
      }
    },
    orderBy: { created_at: 'asc' }
  });

  return (
    <main className="flex-1 overflow-hidden h-full">
      <ChatInterface 
        currentUser={currentUser} 
        users={users}
        channels={channels}
        mainChannelId={mainChannel.id}
      />
    </main>
  );
}
