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

  const currentUserId = session.user.id;
  const currentUserEmail = session.user.email?.toLowerCase();

  // Executa todas as consultas de forma paralela simultânea (reduz tempo de resposta em ~50%)
  const [dbUser, prismaUsers, mainChannelFound, userChannels, departments] = await Promise.all([
    prisma.user.findFirst({
      where: {
        OR: [
          { id: currentUserId },
          ...(currentUserEmail ? [{ email: currentUserEmail }] : [])
        ]
      },
      select: { id: true, name: true, avatar: true }
    }),
    prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        avatar: true,
        job_title: true,
        status: true,
        last_seen_at: true,
      },
      orderBy: { name: 'asc' }
    }),
    prisma.chatChannel.findFirst({
      where: { name: "Geral" }
    }),
    prisma.chatChannel.findMany({
      where: {
        OR: [
          { is_group: true },
          { members: { some: { id: currentUserId } } }
        ]
      },
      include: {
        members: {
          select: { id: true, name: true, avatar: true, email: true, job_title: true }
        }
      },
      orderBy: { created_at: 'asc' }
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ]);

  const currentUser = dbUser || {
    id: currentUserId,
    name: session.user.name || "Usuário",
    avatar: null
  };

  // Marcar presença do usuário logado
  const { recordUserPresence, isUserOnline, getUserLastSeen } = await import("@/lib/presence");
  recordUserPresence(session.user.id, session.user.name || undefined, session.user.email || undefined);

  const userMap = new Map<string, any>();
  for (const u of prismaUsers) {
    userMap.set(u.email.toLowerCase(), { ...u });
  }

  const users = Array.from(userMap.values())
    .filter(u => {
      const isMeById = u.id === currentUserId || u.id === session.user.id;
      const isMeByEmail = currentUserEmail && u.email.toLowerCase() === currentUserEmail;
      return !isMeById && !isMeByEmail;
    })
    .map(u => ({
      ...u,
      isOnline: isUserOnline(u.id, u.email, u.last_seen_at),
      lastSeen: getUserLastSeen(u.id, u.email, u.last_seen_at),
    }));

  users.sort((a, b) => {
    if (a.isOnline === b.isOnline) return a.name.localeCompare(b.name);
    return a.isOnline ? -1 : 1;
  });

  // Garante que o canal "Geral" exista
  let mainChannel = mainChannelFound;
  let channels = userChannels;

  if (!mainChannel) {
    mainChannel = await prisma.chatChannel.create({
      data: { name: "Geral", is_group: true }
    });
    channels = [{ ...mainChannel, members: [] }, ...channels];
  }

  return (
    <div className="flex-1 overflow-hidden h-full min-h-0 flex flex-col">
      <ChatInterface 
        currentUser={currentUser} 
        users={users}
        channels={channels}
        mainChannelId={mainChannel.id}
        departments={departments}
      />
    </div>
  );
}
