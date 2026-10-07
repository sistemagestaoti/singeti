import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "./ChatInterface";

export default async function ConnectPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, avatar: true }
  });

  // Fetch users for DM list
  const users = await prisma.user.findMany({
    where: { id: { not: session.user.id } },
    select: { id: true, name: true, email: true, avatar: true }
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

  // Fetch channels
  const channels = await prisma.chatChannel.findMany({
    include: {
      members: true
    }
  });

  return (
    <main className="flex-1 overflow-hidden h-full">
      <ChatInterface 
        currentUser={{ id: dbUser!.id, name: dbUser!.name || "User", avatar: dbUser!.avatar }} 
        users={users}
        channels={channels}
        mainChannelId={mainChannel.id}
      />
    </main>
  );
}
