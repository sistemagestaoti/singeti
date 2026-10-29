import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { messageId, emoji } = body;

    if (!messageId || typeof messageId !== "string" || !emoji || typeof emoji !== "string") {
      return new NextResponse("Campos messageId e emoji são obrigatórios", { status: 400 });
    }

    const cleanEmoji = emoji.trim();
    // Proteção contra payloads maliciosos, HTML ou strings longas
    if (
      cleanEmoji.length === 0 ||
      cleanEmoji.length > 24 ||
      /[<>'"`;]/.test(cleanEmoji)
    ) {
      return new NextResponse("Emoji inválido", { status: 400 });
    }

    // Resolução resiliente do usuário autenticado
    let userId = session.user.id;
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists && session.user.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (userByEmail) userId = userByEmail.id;
    }

    // Valida se a mensagem existe e se o usuário tem permissão para acessar o canal da mensagem
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        channel_id: true,
        channel: {
          select: {
            id: true,
            name: true,
            is_group: true,
            members: { select: { id: true } },
          },
        },
      },
    });

    if (!message) {
      return new NextResponse("Mensagem não encontrada ou excluída", { status: 404 });
    }

    const isMember = message.channel.members.some((m) => m.id === userId);
    const isGeneralPublic = message.channel.is_group && message.channel.name === "Geral";
    if (!isMember && !isGeneralPublic) {
      return new NextResponse("Acesso negado a esta conversa", { status: 403 });
    }

    // Verifica se a reação já existe (unicidade message_id + user_id + emoji)
    const existing = await prisma.chatMessageReaction.findUnique({
      where: {
        message_id_user_id_emoji: {
          message_id: messageId,
          user_id: userId,
          emoji: cleanEmoji,
        },
      },
    });

    let action: "added" | "removed" = "added";

    if (existing) {
      await prisma.chatMessageReaction.delete({
        where: { id: existing.id },
      });
      action = "removed";
    } else {
      await prisma.chatMessageReaction.create({
        data: {
          message_id: messageId,
          user_id: userId,
          emoji: cleanEmoji,
        },
      });
      action = "added";
    }

    // Retorna todas as reações atualizadas da mensagem (ordenadas por criação)
    const updatedReactions = await prisma.chatMessageReaction.findMany({
      where: { message_id: messageId },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        emoji: true,
        user_id: true,
        created_at: true,
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      action,
      messageId,
      channelId: message.channel_id,
      reactions: updatedReactions,
    });
  } catch (err: any) {
    console.error("POST /api/chat/reactions error:", err);
    return NextResponse.json({ error: "Erro ao processar reação" }, { status: 500 });
  }
}
