import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  resolveChatUser,
  ALLOWED_MESSAGE_TYPES,
  MAX_MESSAGE_PAYLOAD_LENGTH,
  validateStickerContent,
  summarizeMessageContent,
} from "@/lib/chatUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function generateCorrelationId(): string {
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// GET messages for a channel
export async function GET(request: Request) {
  const correlationId = generateCorrelationId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado.", code: "UNAUTHORIZED", correlationId, retryable: false },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        { error: "O parâmetro channelId é obrigatório.", code: "CHANNEL_ID_REQUIRED", correlationId, retryable: false },
        { status: 400 }
      );
    }

    const resolvedUser = await resolveChatUser(session.user);
    const currentUserId = resolvedUser?.id || session.user.id;

    // Busca apenas mensagens que ainda NÃO possuem recibo READ deste usuário (evita reprocessar histórico já lido)
    const unreadMessages = await prisma.chatMessage.findMany({
      where: {
        channel_id: channelId,
        sender_id: { not: currentUserId },
        receipts: {
          none: {
            user_id: currentUserId,
            status: "READ",
          },
        },
      },
      select: { id: true },
      take: 50,
      orderBy: { created_at: "desc" },
    });

    if (unreadMessages.length > 0 && resolvedUser) {
      const unreadIds = unreadMessages.map((m) => m.id);
      // Bulk operation em 2 queries em vez de 50 upserts concorrentes (elimina exaustão do pool de conexões)
      await Promise.all([
        prisma.chatMessage.updateMany({
          where: {
            id: { in: unreadIds },
            is_read: false,
          },
          data: { is_read: true },
        }),
        prisma.chatMessageReceipt.createMany({
          data: unreadIds.map((msgId) => ({
            message_id: msgId,
            user_id: resolvedUser.id,
            status: "READ",
          })),
          skipDuplicates: true,
        }),
        prisma.chatMessageReceipt.updateMany({
          where: {
            message_id: { in: unreadIds },
            user_id: resolvedUser.id,
            status: { not: "READ" },
          },
          data: { status: "READ" },
        }),
      ]).catch((err) => {
        console.warn(`[GET /api/chat][${correlationId}] Aviso ao atualizar recibos de leitura:`, err?.message);
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { channel_id: channelId },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        receipts: {
          select: { user_id: true, status: true, updated_at: true },
        },
      },
      orderBy: { created_at: "asc" },
      take: 150,
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error(`[GET /api/chat][${correlationId}] Erro interno:`, error);
    return NextResponse.json(
      {
        error: "Não foi possível carregar as mensagens deste canal no momento.",
        code: "CHAT_FETCH_FAILED",
        correlationId,
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// POST a new message
export async function POST(request: Request) {
  const correlationId = generateCorrelationId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Sessão expirada ou não autenticada.", code: "UNAUTHORIZED", correlationId, retryable: false },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição JSON inválido.", code: "INVALID_JSON", correlationId, retryable: false },
        { status: 400 }
      );
    }

    const { content, channelId, type, replyToId, fileName, fileSize, metadata, clientId } = body || {};

    if (!channelId || typeof channelId !== "string") {
      return NextResponse.json(
        { error: "Canal de destino (channelId) não informado.", code: "MISSING_CHANNEL_ID", correlationId, retryable: false },
        { status: 400 }
      );
    }

    const msgType = typeof type === "string" && type.trim() ? type.trim().toLowerCase() : "text";
    if (!ALLOWED_MESSAGE_TYPES.has(msgType)) {
      return NextResponse.json(
        {
          error: `Tipo de mensagem não suportado: ${msgType}.`,
          code: "UNSUPPORTED_MESSAGE_TYPE",
          correlationId,
          retryable: false,
        },
        { status: 415 }
      );
    }

    // Validação específica para figurinhas (stickers)
    if (msgType === "sticker") {
      const stickerValidation = validateStickerContent(content);
      if (!stickerValidation.valid) {
        return NextResponse.json(
          {
            error: stickerValidation.message,
            code: stickerValidation.code,
            correlationId,
            retryable: false,
          },
          { status: stickerValidation.status || 422 }
        );
      }
    } else {
      if (typeof content !== "string" || !content.trim()) {
        return NextResponse.json(
          { error: "Conteúdo da mensagem não pode ser vazio.", code: "EMPTY_CONTENT", correlationId, retryable: false },
          { status: 400 }
        );
      }
      if (content.length > MAX_MESSAGE_PAYLOAD_LENGTH) {
        return NextResponse.json(
          {
            error: "O conteúdo da mensagem excede o limite máximo permitido (4 MB).",
            code: "PAYLOAD_TOO_LARGE",
            correlationId,
            retryable: false,
          },
          { status: 413 }
        );
      }
    }

    // Valida metadados opcionais
    let serializedMetadata: string | null = null;
    if (metadata !== undefined && metadata !== null) {
      try {
        serializedMetadata = typeof metadata === "string" ? metadata : JSON.stringify(metadata);
        if (serializedMetadata.length > 32_000) {
          return NextResponse.json(
            { error: "Metadados da mensagem excedem o limite permitido.", code: "METADATA_TOO_LARGE", correlationId, retryable: false },
            { status: 422 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Metadados da mensagem malformados.", code: "INVALID_METADATA", correlationId, retryable: false },
          { status: 422 }
        );
      }
    }

    // Resolve usuário real no banco de dados (impede P2003 Foreign Key Constraint)
    const senderUser = await resolveChatUser(session.user);
    if (!senderUser) {
      return NextResponse.json(
        {
          error: "Usuário remetente não localizado no banco de dados.",
          code: "SENDER_NOT_FOUND",
          correlationId,
          retryable: false,
        },
        { status: 422 }
      );
    }
    const senderId = senderUser.id;

    // Verifica existência do canal antes de gravar
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: { members: { select: { id: true } } },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Canal de conversa não encontrado.", code: "CHANNEL_NOT_FOUND", correlationId, retryable: false },
        { status: 404 }
      );
    }

    // Idempotência: se o cliente reenviar a mesma mensagem (retry de rede), retorna a já gravada sem duplicar
    if (clientId && typeof clientId === "string") {
      const existing = await prisma.chatMessage.findFirst({
        where: { client_id: clientId },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
          receipts: { select: { user_id: true, status: true, updated_at: true } },
        },
      });
      if (existing) {
        return NextResponse.json(existing);
      }
    }

    let message;
    try {
      message = await prisma.chatMessage.create({
        data: {
          content: content.trim(),
          channel_id: channelId,
          sender_id: senderId,
          type: msgType,
          reply_to_id: replyToId || null,
          file_name: fileName || null,
          file_size: typeof fileSize === "number" ? fileSize : null,
          metadata: serializedMetadata,
          client_id: clientId && typeof clientId === "string" ? clientId : null,
          is_read: false,
        },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
          reactions: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          receipts: {
            select: { user_id: true, status: true, updated_at: true },
          },
        },
      });
    } catch (err: any) {
      // Corrida de idempotência: se outra requisição paralela gravou o mesmo client_id simultaneamente
      if (err?.code === "P2002" && clientId) {
        const existing = await prisma.chatMessage.findFirst({
          where: { client_id: clientId },
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
            reactions: { include: { user: { select: { id: true, name: true } } } },
            receipts: { select: { user_id: true, status: true, updated_at: true } },
          },
        });
        if (existing) return NextResponse.json(existing);
      }
      throw err;
    }

    // Atualiza updated_at do canal e grava outbox em background controlado sem bloquear ou derrubar o envio
    const snippet = summarizeMessageContent(content, msgType, fileName);

    Promise.all([
      prisma.chatChannel.update({
        where: { id: channelId },
        data: { updated_at: new Date() },
      }),
      (async () => {
        let recipientIds: string[] = [];
        if (channel.is_group && channel.members.length === 0) {
          const allActive = await prisma.user.findMany({
            where: { status: { in: ["ACTIVE", "active"] }, id: { not: senderId } },
            select: { id: true },
            take: 100,
          });
          recipientIds = allActive.map((u) => u.id);
        } else {
          recipientIds = channel.members.map((m) => m.id).filter((id) => id !== senderId);
        }

        if (recipientIds.length > 0) {
          await prisma.chatNotificationOutbox.createMany({
            data: recipientIds.map((rid) => ({
              recipient_id: rid,
              sender_id: senderId,
              channel_id: channelId,
              message_id: message.id,
              title: channel.is_group
                ? `#${channel.name || "Geral"} — ${message.sender.name}`
                : message.sender.name,
              body: snippet,
              status: "PENDING",
            })),
            skipDuplicates: true,
          });
        }
      })(),
    ]).catch((bgErr) => {
      console.warn(`[POST /api/chat][${correlationId}] Aviso em pós-processamento outbox/channel:`, bgErr?.message);
    });

    return NextResponse.json(message);
  } catch (error: any) {
    console.error(`[POST /api/chat][${correlationId}] Erro ao enviar mensagem:`, error);
    return NextResponse.json(
      {
        error: "Não foi possível enviar a mensagem no momento. Tente novamente.",
        code: error?.code || "CHAT_POST_FAILED",
        correlationId,
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// PATCH: Edit message content OR Toggle Pin
export async function PATCH(request: Request) {
  const correlationId = generateCorrelationId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado.", code: "UNAUTHORIZED", correlationId, retryable: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { messageId, content, isPinned } = body || {};

    if (!messageId) {
      return NextResponse.json(
        { error: "messageId é obrigatório.", code: "MISSING_MESSAGE_ID", correlationId, retryable: false },
        { status: 400 }
      );
    }

    const existing = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!existing) {
      return NextResponse.json(
        { error: "Mensagem não encontrada.", code: "MESSAGE_NOT_FOUND", correlationId, retryable: false },
        { status: 404 }
      );
    }

    const resolvedUser = await resolveChatUser(session.user);
    const currentUserId = resolvedUser?.id || session.user.id;

    // Se estiver editando texto, apenas o próprio autor pode editar
    if (content !== undefined) {
      if (existing.sender_id !== currentUserId) {
        return NextResponse.json(
          { error: "Apenas o autor pode editar a mensagem.", code: "FORBIDDEN", correlationId, retryable: false },
          { status: 403 }
        );
      }

      const updated = await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          content: String(content).trim(),
          is_edited: true,
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      return NextResponse.json(updated);
    }

    // Se estiver fixando/desafixando mensagem
    if (isPinned !== undefined) {
      const updated = await prisma.chatMessage.update({
        where: { id: messageId },
        data: { is_pinned: Boolean(isPinned) },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: "Nenhuma alteração informada.", code: "NO_CHANGES", correlationId, retryable: false },
      { status: 400 }
    );
  } catch (error: any) {
    console.error(`[PATCH /api/chat][${correlationId}] Erro interno:`, error);
    return NextResponse.json(
      { error: "Falha ao atualizar mensagem.", code: "CHAT_PATCH_FAILED", correlationId, retryable: true },
      { status: 500 }
    );
  }
}

// DELETE: Remove message
export async function DELETE(request: Request) {
  const correlationId = generateCorrelationId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado.", code: "UNAUTHORIZED", correlationId, retryable: false },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { error: "messageId é obrigatório.", code: "MISSING_MESSAGE_ID", correlationId, retryable: false },
        { status: 400 }
      );
    }

    const existing = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!existing) {
      return NextResponse.json(
        { error: "Mensagem não encontrada.", code: "MESSAGE_NOT_FOUND", correlationId, retryable: false },
        { status: 404 }
      );
    }

    const resolvedUser = await resolveChatUser(session.user);
    const currentUserId = resolvedUser?.id || session.user.id;
    const isAdmin =
      (session.user as any).role === "ADMIN" || (session.user as any).role === "SUPER_ADMIN";

    if (existing.sender_id !== currentUserId && !isAdmin) {
      return NextResponse.json(
        { error: "Sem permissão para excluir esta mensagem.", code: "FORBIDDEN", correlationId, retryable: false },
        { status: 403 }
      );
    }

    await prisma.chatMessage.delete({ where: { id: messageId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[DELETE /api/chat][${correlationId}] Erro interno:`, error);
    return NextResponse.json(
      { error: "Falha ao excluir mensagem.", code: "CHAT_DELETE_FAILED", correlationId, retryable: true },
      { status: 500 }
    );
  }
}
