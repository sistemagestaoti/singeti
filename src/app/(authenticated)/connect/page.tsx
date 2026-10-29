import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "./ChatInterface";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ConnectPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const currentUserId = session.user.id;
  const currentUserEmail = session.user.email?.toLowerCase();

  let dbUser: { id: string; name: string; avatar: string | null } | null = null;
  let prismaUsers: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    job_title: string | null;
    status: string;
    last_seen_at: Date | null;
  }> = [];
  let mainChannelFound: any = null;
  let userChannels: any[] = [];
  let departments: Array<{ id: string; name: string }> = [];

  try {
    // Executa todas as consultas com resiliência individual (Promise.allSettled evita que uma falha derrube o SSR e gere React #441)
    const results = await Promise.allSettled([
      prisma.user.findFirst({
        where: {
          OR: [
            { id: currentUserId },
            ...(currentUserEmail ? [{ email: currentUserEmail }] : []),
          ],
        },
        select: { id: true, name: true, avatar: true },
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
        orderBy: { name: "asc" },
      }),
      prisma.chatChannel.findFirst({
        where: { name: "Geral" },
      }),
      prisma.chatChannel.findMany({
        where: {
          OR: [
            { is_group: true },
            { members: { some: { id: currentUserId } } },
          ],
        },
        include: {
          members: {
            select: { id: true, name: true, avatar: true, email: true, job_title: true },
          },
        },
        orderBy: { created_at: "asc" },
      }),
      prisma.department.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (results[0].status === "fulfilled") dbUser = results[0].value;
    if (results[1].status === "fulfilled") prismaUsers = results[1].value;
    if (results[2].status === "fulfilled") mainChannelFound = results[2].value;
    if (results[3].status === "fulfilled") userChannels = results[3].value;
    if (results[4].status === "fulfilled") departments = results[4].value;
  } catch (err) {
    console.error("[ConnectPage SSR] Aviso de contingência ao carregar dados iniciais:", err);
  }

  // Se o ID da sessão era "admin-master" e não bateu no findFirst, tenta usar o primeiro usuário da lista como fallback
  if (!dbUser && prismaUsers.length > 0) {
    const firstMatch =
      (currentUserEmail && prismaUsers.find((u) => u.email.toLowerCase() === currentUserEmail)) ||
      prismaUsers[0];
    if (firstMatch) {
      dbUser = { id: firstMatch.id, name: firstMatch.name, avatar: firstMatch.avatar };
    }
  }

  const currentUser = dbUser || {
    id: currentUserId,
    name: session.user.name || "Usuário",
    avatar: null,
  };

  // Marcar presença do usuário logado de forma segura
  let isUserOnlineFn: (id: string, email?: string | null, lastSeen?: Date | null) => boolean = () => false;
  let getUserLastSeenFn: (id: string, email?: string | null, lastSeen?: Date | null) => number | null = () => null;
  try {
    const presenceMod = await import("@/lib/presence");
    presenceMod.recordUserPresence(currentUser.id, currentUser.name || undefined, session.user.email || undefined);
    isUserOnlineFn = presenceMod.isUserOnline;
    getUserLastSeenFn = presenceMod.getUserLastSeen;
  } catch {}

  const userMap = new Map<string, any>();
  for (const u of prismaUsers) {
    if (u.email) {
      userMap.set(u.email.toLowerCase(), { ...u });
    }
  }

  const users = Array.from(userMap.values())
    .filter((u) => {
      const isMeById = u.id === currentUser.id || u.id === session.user.id;
      const isMeByEmail = currentUserEmail && u.email.toLowerCase() === currentUserEmail;
      return !isMeById && !isMeByEmail;
    })
    .map((u) => ({
      ...u,
      isOnline: isUserOnlineFn(u.id, u.email, u.last_seen_at),
      lastSeen: getUserLastSeenFn(u.id, u.email, u.last_seen_at),
    }));

  users.sort((a, b) => {
    if (a.isOnline === b.isOnline) return a.name.localeCompare(b.name);
    return a.isOnline ? -1 : 1;
  });

  // Garante que o canal "Geral" exista (com fallback em memória caso o banco esteja temporariamente ocupado)
  let mainChannel = mainChannelFound;
  let channels = userChannels;

  if (!mainChannel) {
    try {
      mainChannel = await prisma.chatChannel.create({
        data: { name: "Geral", is_group: true },
      });
      channels = [{ ...mainChannel, members: [] }, ...channels];
    } catch {
      const existingGeral = channels.find((c) => c.name === "Geral");
      if (existingGeral) {
        mainChannel = existingGeral;
      } else {
        mainChannel = {
          id: "fallback-geral",
          name: "Geral",
          is_group: true,
          members: [],
        };
        channels = [mainChannel, ...channels];
      }
    }
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
