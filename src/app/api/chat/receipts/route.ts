import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let currentUserId = session.user.id;
    const userExists = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!userExists && session.user.email) {
      const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (userByEmail) currentUserId = userByEmail.id;
    }

    const body = await request.json();
    const { messageIds, channelId, status } = body; // status: "DELIVERED" | "READ"

    if (!status || (status !== "DELIVERED" && status !== "READ")) {
      return NextResponse.json({ error: "Status inválido (use DELIVERED ou READ)" }, { status: 400 });
    }

    let targetMessageIds: string[] = Array.isArray(messageIds) ? messageIds : [];

    // Se passou channelId, busca todas as mensagens não enviadas por mim nesse canal
    if (channelId && targetMessageIds.length === 0) {
      const msgs = await prisma.chatMessage.findMany({
        where: {
          channel_id: channelId,
          sender_id: { not: currentUserId },
        },
        select: { id: true },
        take: 100,
        orderBy: { created_at: "desc" },
      });
      targetMessageIds = msgs.map((m) => m.id);

      // Se for READ, atualiza também a flag is_read do canal para compatibilidade
      if (status === "READ") {
        await prisma.chatMessage.updateMany({
          where: {
            channel_id: channelId,
            sender_id: { not: currentUserId },
            is_read: false,
          },
          data: { is_read: true },
        }).catch(() => {});
      }
    }

    if (targetMessageIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Registra / Atualiza os recibos de entrega ou leitura
    const upsertPromises = targetMessageIds.map((msgId) =>
      prisma.chatMessageReceipt.upsert({
        where: {
          message_id_user_id: {
            message_id: msgId,
            user_id: currentUserId,
          },
        },
        create: {
          message_id: msgId,
          user_id: currentUserId,
          status,
        },
        update: {
          status,
        },
      })
    );

    await Promise.all(upsertPromises);

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
