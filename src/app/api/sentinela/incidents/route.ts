import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (severity && severity !== "ALL") {
      where.severity = severity;
    }

    const incidents = await prisma.sentinelaIncident.findMany({
      where,
      orderBy: [
        { severity: "asc" },
        { last_seen_at: "desc" },
      ],
      take: 100,
      include: {
        actions: {
          select: { id: true, title: true, status: true, autonomy_level: true },
        },
      },
    });

    return NextResponse.json({ incidents });
  } catch (error: any) {
    console.error("GET /api/sentinela/incidents error:", error);
    return NextResponse.json(
      { error: "Erro ao listar incidentes", details: error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, recommendation } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "ID e status são obrigatórios" }, { status: 400 });
    }

    const updated = await prisma.sentinelaIncident.update({
      where: { id },
      data: {
        status,
        recommendation: recommendation || undefined,
        resolved_at: status === "RESOLVED" ? new Date() : undefined,
      },
    });

    await prisma.sentinelaAuditLog.create({
      data: {
        action: "UPDATE_INCIDENT_STATUS",
        user_name: session.user.name || "Administrador",
        user_email: session.user.email || undefined,
        details: JSON.stringify({ incidentId: id, status, recommendation }),
      },
    });

    return NextResponse.json({ incident: updated });
  } catch (error: any) {
    console.error("PATCH /api/sentinela/incidents error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar incidente", details: error?.message },
      { status: 500 }
    );
  }
}
