import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SentinelaInspector } from "@/lib/sentinela/inspector";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const report = await SentinelaInspector.runFullAudit();

    // Busca últimas telemetrias registradas
    const recentTelemetry = await prisma.sentinelaTelemetry.findMany({
      orderBy: { created_at: "desc" },
      take: 20,
    });

    return NextResponse.json({
      report,
      recentTelemetry,
    });
  } catch (error: any) {
    console.error("GET /api/sentinela/health error:", error);
    return NextResponse.json(
      { error: "Erro ao obter saúde da plataforma", details: error?.message },
      { status: 500 }
    );
  }
}
