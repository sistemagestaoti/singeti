import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveChatUser } from "@/lib/chatUtils";

// POST: Create or find a Direct Message channel OR Create a Group Channel
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedUser = await resolveChatUser(session.user);
    if (!resolvedUser) {
      return NextResponse.json({ error: "Usuário autenticado não encontrado no banco" }, { status: 422 });
    }
    const currentUserId = resolvedUser.id;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { targetUserId, isGroup, name, description, image, memberIds } = body || {};

    // ====================================================================
    // MODO 1: CRIAÇÃO DE GRUPO OU CANAL CORPORATIVO
    // ====================================================================
    if (isGroup) {
      if (!name || !String(name).trim()) {
        return NextResponse.json({ error: "Nome do grupo é obrigatório" }, { status: 400 });
      }

      // Garante que o criador está na lista de membros e que todos os IDs existem no banco
      const requestedSet = new Set<string>([currentUserId, ...(Array.isArray(memberIds) ? memberIds : [])]);
      const validMembers = await prisma.user.findMany({
        where: { id: { in: Array.from(requestedSet) } },
        select: { id: true },
      });

      // Garante que pelo menos o usuário criador esteja nos membros
      if (!validMembers.some((m) => m.id === currentUserId)) {
        validMembers.push({ id: currentUserId });
      }

      const groupChannel = await prisma.chatChannel.create({
        data: {
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          image: image ? String(image).trim() : null,
          is_group: true,
          admin_id: currentUserId,
          members: {
            connect: validMembers.map((m) => ({ id: m.id })),
          },
        },
        include: {
          members: {
            select: { id: true, name: true, avatar: true, email: true, job_title: true },
          },
        },
      });

      return NextResponse.json(groupChannel);
    }

    // ====================================================================
    // MODO 2: CRIAÇÃO / ABERTURA DE MENSAGEM DIRETA (1 PARA 1)
    // ====================================================================
    if (!targetUserId) {
      return NextResponse.json({ error: "Target user ID required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Destinatário não encontrado" }, { status: 404 });
    }

    // Check if a 1-on-1 channel already exists between these two users
    const existingChannels = await prisma.chatChannel.findMany({
      where: {
        is_group: false,
        AND: [
          { members: { some: { id: currentUserId } } },
          { members: { some: { id: targetUserId } } },
        ],
      },
      include: {
        members: {
          select: { id: true, name: true, avatar: true, email: true, job_title: true },
        },
      },
    });

    const exactChannel = existingChannels.find((c) => c.members.length === 2);

    if (exactChannel) {
      return NextResponse.json(exactChannel);
    }

    // Create a new 1-on-1 channel
    const newChannel = await prisma.chatChannel.create({
      data: {
        is_group: false,
        members: {
          connect: [{ id: currentUserId }, { id: targetUserId }],
        },
      },
      include: {
        members: {
          select: { id: true, name: true, avatar: true, email: true, job_title: true },
        },
      },
    });

    return NextResponse.json(newChannel);
  } catch (error: any) {
    console.error("POST /api/chat/channel error:", error);
    return NextResponse.json(
      { error: "Erro ao criar ou abrir canal", details: error?.message },
      { status: 500 }
    );
  }
}
