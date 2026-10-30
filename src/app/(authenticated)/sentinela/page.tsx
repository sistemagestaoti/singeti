import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SentinelaInspector } from "@/lib/sentinela/inspector";
import { prisma } from "@/lib/prisma";
import { SentinelaDashboard } from "@/components/sentinela/SentinelaDashboard";

export const dynamic = "force-dynamic";

export default async function SentinelaPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // Executa auditoria inicial no SSR
  const initialReport = await SentinelaInspector.runFullAudit();

  // Busca incidentes abertos
  const initialIncidents = await prisma.sentinelaIncident.findMany({
    orderBy: [
      { severity: "asc" },
      { last_seen_at: "desc" },
    ],
    take: 50,
    include: {
      actions: {
        select: { id: true, title: true, status: true, autonomy_level: true },
      },
    },
  });

  // Busca ações registradas
  const initialActions = await prisma.sentinelaAction.findMany({
    orderBy: { created_at: "desc" },
    take: 30,
    include: {
      incident: {
        select: { id: true, title: true, severity: true, module: true },
      },
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <SentinelaDashboard
        initialReport={initialReport}
        initialIncidents={initialIncidents}
        initialActions={initialActions}
      />
    </div>
  );
}
