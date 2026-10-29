import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');
  const after = searchParams.get('after'); // ISO string cursor para delta-reconciliação
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '150', 10)));

  if (!channelId) return new NextResponse("Missing channelId", { status: 400 });

  // Resolve current user ID
  let currentUserId = session.user.id;
  const userExists = await prisma.user.findUnique({ where: { id: currentUserId } });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (userByEmail) currentUserId = userByEmail.id;
  }

  // Autorização: somente membros do canal (ou canais de grupo públicos) podem ler o histórico
  const allowed = await prisma.chatChannel.findFirst({
    where: {
      id: channelId,
      OR: [{ is_group: true }, { members: { some: { id: currentUserId } } }],
    },
    select: { id: true },
  });
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  // 1. Marca mensagens recebidas como lidas
  await prisma.chatMessage.updateMany({
    where: {
      channel_id: channelId,
      sender_id: { not: currentUserId },
      is_read: false
    },
    data: {
      is_read: true
    }
  }).catch(() => {});

  // Registra recibo de leitura individual
  const unreadMessages = await prisma.chatMessage.findMany({
    where: {
      channel_id: channelId,
      sender_id: { not: currentUserId },
    },
    select: { id: true },
    take: 50,
  }).catch(() => []);

  if (unreadMessages.length > 0) {
    Promise.all(
      unreadMessages.map((m) =>
        prisma.chatMessageReceipt.upsert({
          where: { message_id_user_id: { message_id: m.id, user_id: currentUserId } },
          create: { message_id: m.id, user_id: currentUserId, status: "READ" },
          update: { status: "READ" },
        })
      )
    ).catch(() => {});
  }

  // 2. Consulta de mensagens (com suporte a delta-cursor após reconexão)
  const whereClause: any = { channel_id: channelId };
  if (after) {
    const afterDate = new Date(after);
    if (!isNaN(afterDate.getTime())) {
      whereClause.created_at = { gt: afterDate };
    }
  }

  const messages = await prisma.chatMessage.findMany({
    where: whereClause,
    select: {
      id: true,
      client_id: true,
      content: true,
      type: true,
      channel_id: true,
      sender_id: true,
      status: true,
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
      },
      receipts: {
        select: {
          user_id: true,
          status: true,
          updated_at: true,
        }
      }
    },
    orderBy: { created_at: 'asc' },
    take: limit
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const { channelId, content, type = "text", fileName, fileSize, replyToId, metadata, clientId } = body;

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

  // 1. GARANTIA DE IDEMPOTÊNCIA: Se já foi salva com este clientId, retorna a mensagem existente
  if (clientId) {
    const existing = await prisma.chatMessage.findFirst({
      where: {
        client_id: clientId,
        channel_id: channelId,
      },
      select: {
        id: true,
        client_id: true,
        content: true,
        type: true,
        channel_id: true,
        sender_id: true,
        status: true,
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
            user: { select: { id: true, name: true } }
          }
        },
        receipts: {
          select: { user_id: true, status: true, updated_at: true }
        }
      }
    });

    if (existing) {
      return NextResponse.json(existing);
    }
  }

  // 2. Busca canal e membros para fila de notificação
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    include: {
      members: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // Autorização: canal precisa existir e o remetente precisa ser membro (ou grupo público)
  if (!channel) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }
  if (!channel.is_group && !channel.members.some((m) => m.id === senderId)) {
    return NextResponse.json({ error: "Sem permissão para enviar nesta conversa" }, { status: 403 });
  }

  // 3. Persistência atômica da mensagem
  const message = await prisma.chatMessage.create({
    data: {
      client_id: clientId || null,
      content: content.trim(),
      type: type || "text",
      channel_id: channelId,
      sender_id: senderId,
      status: "SENT",
      file_name: fileName || null,
      file_size: fileSize ? Number(fileSize) : null,
      reply_to_id: replyToId || null,
      metadata: metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null,
    },
    select: {
      id: true,
      client_id: true,
      content: true,
      type: true,
      channel_id: true,
      sender_id: true,
      status: true,
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
      },
      receipts: {
        select: {
          user_id: true,
          status: true,
          updated_at: true,
        }
      }
    }
  });

  // 4. TRANSACTIONAL OUTBOX: Registra eventos de notificação pendente para os destinatários
  if (channel && channel.members) {
    const recipients = channel.members.filter((m) => m.id !== senderId);
    if (recipients.length > 0) {
      const notificationTitle = channel.is_group
        ? `${channel.name || 'Grupo'}`
        : `${message.sender.name}`;

      const snippet = type === "image" ? "📷 Imagem" : type === "file" ? `📄 ${fileName || "Arquivo"}` : type === "ticket" ? "🎫 Chamado compartilhado" : content.trim().slice(0, 140);

      await prisma.chatNotificationOutbox.createMany({
        data: recipients.map((r) => ({
          message_id: message.id,
          recipient_id: r.id,
          sender_id: senderId,
          channel_id: channelId,
          title: notificationTitle,
          body: snippet,
          status: "PENDING"
        }))
      }).catch(() => {});
    }
  }

  // 5. Atualiza updated_at do canal para ordenação cronológica
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
