import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const [
      totalComputers,
      inUseComputers,
      availableComputers,
      maintenanceComputers,
      spareComputers,
      totalCollaborators,
      pendingReviewAccounts,
    ] = await Promise.all([
      prisma.asset.count({ where: { type: "COMPUTER" } }),
      prisma.asset.count({ where: { type: "COMPUTER", status: "IN_USE" } }),
      prisma.asset.count({ where: { type: "COMPUTER", status: "AVAILABLE" } }),
      prisma.asset.count({ where: { type: "COMPUTER", status: "MAINTENANCE" } }),
      prisma.asset.count({ where: { type: "COMPUTER", status: "SPARE" } }),
      prisma.pcCollaborator.count({ where: { status: "ACTIVE" } }),
      prisma.pcAccount.count({ where: { status: "REVIEW_PENDING" } }),
    ]);

    return NextResponse.json({
      total: totalComputers,
      inUse: inUseComputers,
      available: availableComputers,
      maintenance: maintenanceComputers,
      spare: spareComputers,
      collaborators: totalCollaborators,
      pendingReviews: pendingReviewAccounts,
    });
  } catch (error: any) {
    console.error("Erro ao carregar estatísticas de PCs:", error);
    return NextResponse.json({ error: "Erro ao processar indicadores" }, { status: 500 });
  }
}
