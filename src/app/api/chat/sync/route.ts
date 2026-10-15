import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Resolve current user ID
    let currentUserId = session.user.id;
    const userExists = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!userExists && session.user.email) {
      const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (userByEmail) currentUserId = userByEmail.id;
    }

    // Fetch all channels the user belongs to (or public groups)
    const channels = await prisma.chatChannel.findMany({
      where: {
        OR: [
          { is_group: true },
          { members: { some: { id: currentUserId } } }
        ]
      },
      include: {
        members: {
          select: { id: true, name: true, avatar: true, email: true, job_title: true }
        },
        messages: {
          take: 1,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            content: true,
            created_at: true,
            sender_id: true,
            is_read: true,
            sender: { select: { name: true, avatar: true } }
          }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    // Count unread messages per channel (limited to latest 50 to keep polling fast)
    const unreadMessages = await prisma.chatMessage.findMany({
      where: {
        is_read: false,
        sender_id: { not: currentUserId },
        channel: {
          OR: [
            { is_group: true },
            { members: { some: { id: currentUserId } } }
          ]
        }
      },
      select: {
        id: true,
        channel_id: true,
        sender_id: true,
        content: true,
        created_at: true,
        sender: { select: { name: true, avatar: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    const unreadByChannel: Record<string, number> = {};
    const unreadByUser: Record<string, number> = {};

    for (const msg of unreadMessages) {
      unreadByChannel[msg.channel_id] = (unreadByChannel[msg.channel_id] || 0) + 1;
      unreadByUser[msg.sender_id] = (unreadByUser[msg.sender_id] || 0) + 1;
    }

    const totalUnread = unreadMessages.length;
    const latestUnread = unreadMessages.length > 0 ? unreadMessages[0] : null;

    const formattedChannels = channels.map(c => ({
      id: c.id,
      name: c.name,
      is_group: c.is_group,
      members: c.members,
      lastMessage: c.messages[0] || null,
      unreadCount: unreadByChannel[c.id] || 0,
      updated_at: c.updated_at
    }));

    return NextResponse.json({
      success: true,
      currentUserId,
      totalUnread,
      unreadByChannel,
      unreadByUser,
      latestUnread,
      channels: formattedChannels
    });
  } catch (error: any) {
    console.error("GET /api/chat/sync error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
