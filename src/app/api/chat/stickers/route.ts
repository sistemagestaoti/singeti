import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  let userId = session.user.id;
  const userExists = await prisma.user.findUnique({ where: { id: userId } });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (userByEmail) userId = userByEmail.id;
  }

  const stickers = await prisma.userSticker.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: 100
  });

  return NextResponse.json(stickers);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const { url, name } = body;

  if (!url || typeof url !== "string") {
    return new NextResponse("URL da figurinha é obrigatória", { status: 400 });
  }

  let userId = session.user.id;
  const userExists = await prisma.user.findUnique({ where: { id: userId } });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (userByEmail) userId = userByEmail.id;
  }

  // Verifica se já existe para este usuário
  const existing = await prisma.userSticker.findFirst({
    where: {
      user_id: userId,
      url: url.trim()
    }
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const sticker = await prisma.userSticker.create({
    data: {
      user_id: userId,
      url: url.trim(),
      name: name ? String(name).slice(0, 50) : null
    }
  });

  return NextResponse.json(sticker);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return new NextResponse("ID da figurinha é obrigatório", { status: 400 });

  let userId = session.user.id;
  const userExists = await prisma.user.findUnique({ where: { id: userId } });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (userByEmail) userId = userByEmail.id;
  }

  // Garante que só deleta a figurinha pertencente ao usuário
  await prisma.userSticker.deleteMany({
    where: {
      id,
      user_id: userId
    }
  });

  return NextResponse.json({ success: true, deletedId: id });
}
