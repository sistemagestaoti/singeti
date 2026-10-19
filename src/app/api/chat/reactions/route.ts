import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const { messageId, emoji } = body;

  if (!messageId || !emoji || typeof emoji !== "string") {
    return new NextResponse("Campos messageId e emoji são obrigatórios", { status: 400 });
  }

  // Resilient user resolution
  let userId = session.user.id;
  const userExists = await prisma.user.findUnique({ where: { id: userId } });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (userByEmail) userId = userByEmail.id;
  }

  // Verifica se a reação já existe
  const existing = await prisma.chatMessageReaction.findUnique({
    where: {
      message_id_user_id_emoji: {
        message_id: messageId,
        user_id: userId,
        emoji: emoji.trim()
      }
    }
  });

  let action: "added" | "removed" = "added";

  if (existing) {
    // Se já reagiu com o mesmo emoji, remove a reação (toggle)
    await prisma.chatMessageReaction.delete({
      where: { id: existing.id }
    });
    action = "removed";
  } else {
    // Se não reagiu, adiciona
    await prisma.chatMessageReaction.create({
      data: {
        message_id: messageId,
        user_id: userId,
        emoji: emoji.trim()
      }
    });
    action = "added";
  }

  // Retorna todas as reações atualizadas da mensagem
  const updatedReactions = await prisma.chatMessageReaction.findMany({
    where: { message_id: messageId },
    select: {
      id: true,
      emoji: true,
      user_id: true,
      user: {
        select: { id: true, name: true }
      }
    }
  });

  return NextResponse.json({
    success: true,
    action,
    messageId,
    reactions: updatedReactions
  });
}
