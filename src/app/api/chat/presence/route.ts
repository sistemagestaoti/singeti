import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordUserPresence, getAllPresenceMap } from "@/lib/presence";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const name = session.user.name || undefined;
    const email = session.user.email || undefined;

    recordUserPresence(userId, name, email);

    return NextResponse.json({
      success: true,
      presence: getAllPresenceMap(),
    });
  } catch (error: any) {
    console.error("POST /api/chat/presence error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      recordUserPresence(session.user.id, session.user.name || undefined, session.user.email || undefined);
    }

    return NextResponse.json({
      presence: getAllPresenceMap(),
    });
  } catch (error: any) {
    console.error("GET /api/chat/presence error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
