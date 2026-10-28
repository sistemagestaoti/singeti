import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action")?.trim() || "";
    const entityType = searchParams.get("entity_type")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (action && action !== "ALL") {
      where.action = action;
    }

    if (entityType && entityType !== "ALL") {
      where.entity_type = entityType;
    }

    if (search) {
      where.OR = [
        { entity_name: { contains: search, mode: "insensitive" } },
        { user_name: { contains: search, mode: "insensitive" } },
        { user_email: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.pcAccessAuditLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.pcAccessAuditLog.count({ where }),
    ]);

    return NextResponse.json({
      items: logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Erro ao consultar logs de auditoria:", error);
    return NextResponse.json({ error: "Erro ao consultar logs" }, { status: 500 });
  }
}
