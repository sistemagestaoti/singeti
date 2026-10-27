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
    select: {
      id: true,
      content: true,
      type: true,
      channel_id: true,
      sender_id: true,
      is_read: true,
      is_pinned: true,
      is_edited: true,
      reply_to_id: true,
      file_name: true,
      file_size: true,
      metadata: true,
      created_at: true,
      updated_at: true,
      sender: { select: { id: true, name: true, avatar: true } },
      reactions: {
        select: {
          id: true,
          emoji: true,
          user_id: true,
          user: {
            select: { id: true, name: true }
          }
        }
      }
    },
    orderBy: { created_at: 'asc' },
    take: 150
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const { channelId, content, type = "text", fileName, fileSize, replyToId, metadata } = body;

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
      type: type || "text",
      channel_id: channelId,
      sender_id: senderId,
      file_name: fileName || null,
      file_size: fileSize ? Number(fileSize) : null,
      reply_to_id: replyToId || null,
      metadata: metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null,
    },
    select: {
      id: true,
      content: true,
      type: true,
      channel_id: true,
      sender_id: true,
      is_read: true,
      is_pinned: true,
      is_edited: true,
      reply_to_id: true,
      file_name: true,
      file_size: true,
      metadata: true,
      created_at: true,
      updated_at: true,
      sender: { select: { id: true, name: true, avatar: true } },
      reactions: {
        select: {
          id: true,
          emoji: true,
          user_id: true,
          user: {
            select: { id: true, name: true }
          }
        }
      }
    }
  });

  // Touch channel updated_at so recent channels sort to the top
  await prisma.chatChannel.update({
    where: { id: channelId },
    data: { updated_at: new Date() }
  }).catch(() => {});

  return NextResponse.json(message);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const { messageId, content, isPinned } = body;

  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  const existing = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
  }

  let senderId = session.user.id;
  const userExists = await prisma.user.findUnique({ where: { id: senderId } });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (userByEmail) senderId = userByEmail.id;
  }

  // Se for alteração de fixação (pin/unpin)
  if (typeof isPinned === "boolean") {
    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { is_pinned: isPinned },
      select: { id: true, is_pinned: true }
    });
    return NextResponse.json(updated);
  }

  // Se for edição do conteúdo da mensagem (somente o autor pode editar)
  if (existing.sender_id !== senderId) {
    return NextResponse.json({ error: "Apenas o autor pode editar esta mensagem" }, { status: 403 });
  }

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Conteúdo não pode ser vazio" }, { status: 400 });
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      content: content.trim(),
      is_edited: true,
    },
    select: {
      id: true,
      content: true,
      is_edited: true,
      updated_at: true,
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");

  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  const existing = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
  }

  let senderId = session.user.id;
  const userExists = await prisma.user.findUnique({ where: { id: senderId } });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (userByEmail) senderId = userByEmail.id;
  }

  // Apenas o autor ou admin pode excluir
  if (existing.sender_id !== senderId) {
    return NextResponse.json({ error: "Não autorizado a excluir esta mensagem" }, { status: 403 });
  }

  await prisma.chatMessage.delete({
    where: { id: messageId },
  });

  return NextResponse.json({ success: true, deletedId: messageId });
}
