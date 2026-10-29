import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveChatUser, summarizeMessageContent } from "@/lib/chatUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedUser = await resolveChatUser(session.user);
    const currentUserId = resolvedUser?.id || session.user.id;

    // Executa ambas as consultas em paralelo, sem transferir strings Base64 gigantes em content
    const [channels, unreadMessages] = await Promise.all([
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
          messages: {
            take: 1,
            orderBy: { created_at: "desc" },
            select: {
              id: true,
              content: true,
              type: true,
              file_name: true,
              created_at: true,
              sender_id: true,
              is_read: true,
              sender: { select: { name: true, avatar: true } },
            },
          },
        },
        orderBy: { updated_at: "desc" },
      }),
      prisma.chatMessage.findMany({
        where: {
          sender_id: { not: currentUserId },
          receipts: {
            none: {
              user_id: currentUserId,
              status: "READ",
            },
          },
          channel: {
            OR: [
              { is_group: true },
              { members: { some: { id: currentUserId } } },
            ],
          },
        },
        select: {
          id: true,
          channel_id: true,
          sender_id: true,
          content: true,
          type: true,
          file_name: true,
          created_at: true,
          sender: { select: { name: true, avatar: true } },
        },
        orderBy: { created_at: "desc" },
        take: 50,
      }),
    ]);

    const unreadByChannel: Record<string, number> = {};
    const unreadByUser: Record<string, number> = {};
    const unreadIds: string[] = [];

    for (const msg of unreadMessages) {
      unreadByChannel[msg.channel_id] = (unreadByChannel[msg.channel_id] || 0) + 1;
      unreadByUser[msg.sender_id] = (unreadByUser[msg.sender_id] || 0) + 1;
      unreadIds.push(msg.id);
    }

    const totalUnread = unreadMessages.length;
    const rawLatest = unreadMessages.length > 0 ? unreadMessages[0] : null;
    const latestUnread = rawLatest
      ? {
          id: rawLatest.id,
          channel_id: rawLatest.channel_id,
          sender_id: rawLatest.sender_id,
          content: summarizeMessageContent(rawLatest.content, rawLatest.type, rawLatest.file_name),
          type: rawLatest.type,
          created_at: rawLatest.created_at,
          sender: rawLatest.sender,
        }
      : null;

    const formattedChannels = channels.map((c) => {
      const last = c.messages[0] || null;
      return {
        id: c.id,
        name: c.name,
        is_group: c.is_group,
        members: c.members,
        lastMessage: last
          ? {
              id: last.id,
              content: summarizeMessageContent(last.content, last.type, last.file_name),
              type: last.type,
              created_at: last.created_at,
              sender_id: last.sender_id,
              is_read: last.is_read,
              sender: last.sender,
            }
          : null,
        unreadCount: unreadByChannel[c.id] || 0,
        updated_at: c.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      currentUserId,
      totalUnread,
      unreadIds,
      unreadByChannel,
      unreadByUser,
      latestUnread,
      channels: formattedChannels,
    });
  } catch (error: any) {
    console.error("GET /api/chat/sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal error", retryable: true },
      { status: 500 }
    );
  }
}
