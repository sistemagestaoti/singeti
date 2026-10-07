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

  if (!channelId || !content) return new NextResponse("Missing fields", { status: 400 });

  const message = await prisma.chatMessage.create({
    data: {
      content,
      channel_id: channelId,
      sender_id: session.user.id
    }
  });

  return NextResponse.json(message);
}
