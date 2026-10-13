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

  // Fetch all other users for direct message list
  const users = await prisma.user.findMany({
    where: { 
      id: { not: currentUser.id }
    },
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
