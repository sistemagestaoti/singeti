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

  const messages = await prisma.chatMessage.findMany({
    where: { channel_id: channelId },
    include: {
      sender: { select: { name: true, avatar: true } }
    },
    orderBy: { created_at: 'asc' }
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const { channelId, content } = body;

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
      channel_id: channelId,
      sender_id: senderId
    },
    include: {
      sender: { select: { name: true, avatar: true } }
    }
  });

  return NextResponse.json(message);
}
