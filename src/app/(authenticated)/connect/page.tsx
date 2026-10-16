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
    <div className="flex-1 overflow-hidden h-full min-h-0 flex flex-col">
      <ChatInterface 
        currentUser={currentUser} 
        users={users}
        channels={channels}
        mainChannelId={mainChannel.id}
      />
    </div>
  );
}
