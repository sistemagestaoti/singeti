import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();
    const { targetUserId, isGroup, name, description, image, memberIds } = body;

    // Resolve current user ID
    let currentUserId = session.user.id;
    const userExists = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!userExists && session.user.email) {
      const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (userByEmail) currentUserId = userByEmail.id;
    }

    // 1. Criação de Grupo Corporativo / Canal
    if (isGroup) {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: "O nome do grupo ou canal é obrigatório" }, { status: 400 });
      }

      // Garante que o criador está na lista de membros
      const allMemberIds = Array.from(new Set([currentUserId, ...(Array.isArray(memberIds) ? memberIds : [])]));

      const newGroup = await prisma.chatChannel.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          image: image || null,
          is_group: true,
          admin_id: currentUserId,
          members: {
            connect: allMemberIds.map(id => ({ id }))
          }
        },
        include: {
          members: {
            select: { id: true, name: true, avatar: true, email: true, job_title: true }
          }
        }
      });

      return NextResponse.json(newGroup);
    }

    // 2. Criação / Abertura de Mensagem Direta (DM) entre 2 usuários
    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId é obrigatório para chat direto" }, { status: 400 });
    }

    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: "Cannot create a direct channel with yourself" }, { status: 400 });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, avatar: true, email: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Check if a direct message channel already exists between these 2 users
    const existingChannels = await prisma.chatChannel.findMany({
      where: {
        is_group: false,
        AND: [
          { members: { some: { id: currentUserId } } },
          { members: { some: { id: targetUserId } } }
        ]
      },
      include: {
        members: {
          select: { id: true, name: true, avatar: true, email: true, job_title: true }
        }
      }
    });

    if (existingChannels.length > 0) {
      return NextResponse.json(existingChannels[0]);
    }

    // Create new direct message channel
    const newChannel = await prisma.chatChannel.create({
      data: {
        is_group: false,
        name: null,
        members: {
          connect: [
            { id: currentUserId },
            { id: targetUserId }
          ]
        }
      },
      include: {
        members: {
          select: { id: true, name: true, avatar: true, email: true, job_title: true }
        }
      }
    });

    return NextResponse.json(newChannel);
  } catch (error: any) {
    console.error("POST /api/chat/channel error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();
    const { channelId, name, description, image, addMemberIds, removeMemberIds } = body;

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: { members: { select: { id: true } } }
    });

    if (!channel) {
      return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (image !== undefined) updateData.image = image;

    if (Array.isArray(addMemberIds) && addMemberIds.length > 0) {
      updateData.members = {
        connect: addMemberIds.map((id: string) => ({ id }))
      };
    }

    if (Array.isArray(removeMemberIds) && removeMemberIds.length > 0) {
      updateData.members = {
        ...updateData.members,
        disconnect: removeMemberIds.map((id: string) => ({ id }))
      };
    }

    const updatedChannel = await prisma.chatChannel.update({
      where: { id: channelId },
      data: updateData,
      include: {
        members: {
          select: { id: true, name: true, avatar: true, email: true, job_title: true }
        }
      }
    });

    return NextResponse.json(updatedChannel);
  } catch (error: any) {
    console.error("PUT /api/chat/channel error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
