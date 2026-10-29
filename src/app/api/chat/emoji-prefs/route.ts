import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function resolveUserId(session: any): Promise<string | null> {
  if (!session?.user) return null;
  let userId = session.user.id;
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!userExists && session.user.email) {
    const userByEmail = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (userByEmail) userId = userByEmail.id;
  }
  return userId;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = await resolveUserId(session);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const settings = await prisma.chatUserSettings.findUnique({
      where: { user_id: userId },
      select: {
        recent_emojis: true,
        favorite_emojis: true,
        emoji_skin_tone: true,
      },
    });

    let recentEmojis: string[] = [];
    let favoriteEmojis: string[] = [];
    try {
      if (settings?.recent_emojis) recentEmojis = JSON.parse(settings.recent_emojis);
    } catch {}
    try {
      if (settings?.favorite_emojis) favoriteEmojis = JSON.parse(settings.favorite_emojis);
    } catch {}

    return NextResponse.json({
      recentEmojis: Array.isArray(recentEmojis) ? recentEmojis.slice(0, 32) : [],
      favoriteEmojis: Array.isArray(favoriteEmojis) ? favoriteEmojis.slice(0, 48) : [],
      skinTone: settings?.emoji_skin_tone || "",
    });
  } catch (e: any) {
    console.error("GET /api/chat/emoji-prefs error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await resolveUserId(session);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const dataToUpdate: {
      recent_emojis?: string;
      favorite_emojis?: string;
      emoji_skin_tone?: string;
    } = {};

    if (Array.isArray(body.recentEmojis)) {
      const cleaned = body.recentEmojis
        .filter((e: any) => typeof e === "string" && e.length > 0 && e.length <= 24)
        .slice(0, 32);
      dataToUpdate.recent_emojis = JSON.stringify(cleaned);
    }

    if (Array.isArray(body.favoriteEmojis)) {
      const cleaned = body.favoriteEmojis
        .filter((e: any) => typeof e === "string" && e.length > 0 && e.length <= 24)
        .slice(0, 48);
      dataToUpdate.favorite_emojis = JSON.stringify(cleaned);
    }

    if (typeof body.skinTone === "string" && body.skinTone.length <= 8) {
      dataToUpdate.emoji_skin_tone = body.skinTone;
    }

    await prisma.chatUserSettings.upsert({
      where: { user_id: userId },
      update: dataToUpdate,
      create: {
        user_id: userId,
        ...dataToUpdate,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("PUT /api/chat/emoji-prefs error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
