import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SentinelaInspector } from "@/lib/sentinela/inspector";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const report = await SentinelaInspector.runFullAudit();

    await prisma.sentinelaAuditLog.create({
      data: {
        action: "RUN_MANUAL_AUDIT",
        user_name: session.user.name || "Administrador",
        user_email: session.user.email || undefined,
        details: JSON.stringify({ score: report.score, status: report.status, summary: report.summary }),
      },
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("POST /api/sentinela/audit error:", error);
    return NextResponse.json(
      { error: "Erro ao executar auditoria manual", details: error?.message },
      { status: 500 }
    );
  }
}
