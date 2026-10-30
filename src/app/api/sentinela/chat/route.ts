import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SentinelaAiEngine } from "@/lib/sentinela/aiEngine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: "A mensagem é obrigatória" }, { status: 400 });
    }

    const currentUserName = session.user.name || "Administrador";
    const reply = await SentinelaAiEngine.processUserQuery(String(message).trim(), currentUserName);

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("POST /api/sentinela/chat error:", error);
    return NextResponse.json(
      { error: "Erro ao processar consulta do Sentinela IA", details: error?.message },
      { status: 500 }
    );
  }
}
