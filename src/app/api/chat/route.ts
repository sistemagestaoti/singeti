import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) return new NextResponse("Missing channelId", { status: 400 });

  // Resolve current user ID
  let currentUserId = session.user.id;
  const userExists = await prisma.user.findUnique({ where: { id: currentUserId } });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (userByEmail) currentUserId = userByEmail.id;
  }

  // Mark all unread messages in this channel sent by others as read
  await prisma.chatMessage.updateMany({
    where: {
      channel_id: channelId,
      sender_id: { not: currentUserId },
      is_read: false
    },
    data: {
      is_read: true
    }
  });

  const messages = await prisma.chatMessage.findMany({
    where: { channel_id: channelId },
    include: {
      sender: { select: { id: true, name: true, avatar: true } }
    },
    orderBy: { created_at: 'asc' }
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const { channelId, content } = body;

  if (!channelId || !content || !content.trim()) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  // Resilient sender_id resolution
  let senderId = session.user.id;
  const userExists = await prisma.user.findUnique({ where: { id: senderId } });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (userByEmail) senderId = userByEmail.id;
  }

  const message = await prisma.chatMessage.create({
    data: {
      content: content.trim(),
      channel_id: channelId,
      sender_id: senderId
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true } }
    }
  });

  // Touch channel updated_at so recent channels sort to the top
  await prisma.chatChannel.update({
    where: { id: channelId },
    data: { updated_at: new Date() }
  }).catch(() => {});

  return NextResponse.json(message);
}
