import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveChatUser } from "@/lib/chatUtils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedUser = await resolveChatUser(session.user);
    if (!resolvedUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 422 });
    }
    const currentUserId = resolvedUser.id;

    const body = await request.json();
    const { messageIds, channelId, status } = body || {}; // status: "DELIVERED" | "READ"

    if (!status || (status !== "DELIVERED" && status !== "READ")) {
      return NextResponse.json({ error: "Status inválido (use DELIVERED ou READ)" }, { status: 400 });
    }

    let targetMessageIds: string[] = Array.isArray(messageIds) ? messageIds.slice(0, 100) : [];

    // Se passou channelId, busca todas as mensagens não enviadas por mim nesse canal que ainda não tenham esse status
    if (channelId && targetMessageIds.length === 0) {
      const msgs = await prisma.chatMessage.findMany({
        where: {
          channel_id: channelId,
          sender_id: { not: currentUserId },
          receipts: {
            none: {
              user_id: currentUserId,
              status,
            },
          },
        },
        select: { id: true },
        take: 100,
        orderBy: { created_at: "desc" },
      });
      targetMessageIds = msgs.map((m) => m.id);

      // Se for READ, atualiza também a flag is_read do canal para compatibilidade
      if (status === "READ" && targetMessageIds.length > 0) {
        await prisma.chatMessage.updateMany({
          where: {
            id: { in: targetMessageIds },
            is_read: false,
          },
          data: { is_read: true },
        }).catch(() => {});
      }
    }

    if (targetMessageIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Registra / Atualiza os recibos em lote (2 queries em vez de N upserts concorrentes)
    await prisma.chatMessageReceipt.createMany({
      data: targetMessageIds.map((msgId) => ({
        message_id: msgId,
        user_id: currentUserId,
        status,
      })),
      skipDuplicates: true,
    });

    if (status === "READ") {
      // Promove recibos DELIVERED para READ em lote
      await prisma.chatMessageReceipt.updateMany({
        where: {
          message_id: { in: targetMessageIds },
          user_id: currentUserId,
          status: { not: "READ" },
        },
        data: { status: "READ" },
      });
    }

    return NextResponse.json({
      success: true,
      status,
      count: targetMessageIds.length,
      updatedIds: targetMessageIds,
      userId: currentUserId,
    });
  } catch (error: any) {
    console.error("POST /api/chat/receipts error:", error);
    return NextResponse.json({ error: error.message || "Erro ao processar recibo" }, { status: 500 });
  }
}
