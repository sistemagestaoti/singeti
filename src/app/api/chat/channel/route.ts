import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    // Resolve current user ID
    let currentUserId = session.user.id;
    const userExists = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!userExists && session.user.email) {
      const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (userByEmail) currentUserId = userByEmail.id;
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
