import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveChatUser, validateStickerContent } from "@/lib/chatUtils";

// GET: List user's saved stickers
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedUser = await resolveChatUser(session.user);
    if (!resolvedUser) {
      return NextResponse.json([]);
    }

    const stickers = await prisma.userSticker.findMany({
      where: { user_id: resolvedUser.id },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    return NextResponse.json(stickers);
  } catch (error: any) {
    console.error("GET /api/chat/stickers error:", error);
    return NextResponse.json({ error: "Erro ao buscar figurinhas" }, { status: 500 });
  }
}

// POST: Save a new sticker
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { url, name } = body || {};

    const validation = validateStickerContent(url);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message, code: validation.code },
        { status: validation.status || 422 }
      );
    }

    const resolvedUser = await resolveChatUser(session.user);
    if (!resolvedUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado no banco de dados" },
        { status: 422 }
      );
    }

    const sticker = await prisma.userSticker.create({
      data: {
        user_id: resolvedUser.id,
        url: String(url).trim(),
        name: name ? String(name).trim().slice(0, 80) : "Figurinha",
      },
    });

    return NextResponse.json(sticker);
  } catch (error: any) {
    console.error("POST /api/chat/stickers error:", error);
    return NextResponse.json(
      { error: "Erro ao salvar figurinha", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove a saved sticker
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID da figurinha é obrigatório" }, { status: 400 });
    }

    await prisma.userSticker.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/chat/stickers error:", error);
    return NextResponse.json({ error: "Erro ao remover figurinha" }, { status: 500 });
  }
}
