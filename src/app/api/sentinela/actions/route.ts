import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SentinelaActionManager } from "@/lib/sentinela/actionManager";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";

    const actions = await SentinelaActionManager.listActions(status);
    return NextResponse.json({ actions });
  } catch (error: any) {
    console.error("GET /api/sentinela/actions error:", error);
    return NextResponse.json(
      { error: "Erro ao listar ações", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { actionId, operation, reason, newAction } = body;

    const currentUserName = session.user.name || session.user.email || "Administrador";

    // Criar nova ação sob demanda
    if (newAction) {
      const created = await SentinelaActionManager.proposeAction(newAction);
      return NextResponse.json({ success: true, action: created });
    }

    if (!actionId || !operation) {
      return NextResponse.json({ error: "actionId e operation são obrigatórios" }, { status: 400 });
    }

    if (operation === "APPROVE" || operation === "EXECUTE") {
      const executed = await SentinelaActionManager.executeAction(actionId, currentUserName);
      return NextResponse.json({ success: true, action: executed });
    } else if (operation === "REJECT") {
      const rejected = await SentinelaActionManager.rejectAction(actionId, currentUserName, reason);
      return NextResponse.json({ success: true, action: rejected });
    }

    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/sentinela/actions error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar ação", details: error?.message },
      { status: 500 }
    );
  }
}
