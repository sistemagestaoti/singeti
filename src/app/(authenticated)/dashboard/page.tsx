import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardCharts from "./DashboardCharts";
import { Server, HeadphonesIcon, Briefcase, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Fetch all basic stats
  const totalAssets = await prisma.asset.count();
  const totalTickets = await prisma.ticket.count();
  const totalProjects = await prisma.project.count();
  const openProblems = await prisma.problem.count({ where: { status: "OPEN" } });

  // Ticket stats by status for chart
  const ticketsByStatus = await prisma.ticket.groupBy({
    by: ['status'],
    _count: { id: true }
  });

  const chartData = ticketsByStatus.map(t => ({
    name: t.status,
    quantidade: t._count.id
  }));

  // Asset counts by type for chart
  const assetsByType = await prisma.asset.groupBy({
    by: ['type'],
    _count: { id: true }
  });

  const assetChartData = assetsByType.map(a => ({
    name: a.type,
    quantidade: a._count.id
  }));

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Painel Gerencial</h2>
        <p className="text-sm font-medium text-muted-foreground">Visão geral dos indicadores de desempenho da plataforma.</p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex items-start justify-between group hover:border-primary/50 transition-colors">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Ativos na CMDB</h3>
            <p className="text-4xl font-black text-foreground">{totalAssets}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Server className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex items-start justify-between group hover:border-primary/50 transition-colors">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Chamados Totais</h3>
            <p className="text-4xl font-black text-foreground">{totalTickets}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center text-info group-hover:scale-110 transition-transform">
            <HeadphonesIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex items-start justify-between group hover:border-success/50 transition-colors">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Projetos de TI</h3>
            <p className="text-4xl font-black text-foreground">{totalProjects}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success group-hover:scale-110 transition-transform">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex items-start justify-between group hover:border-danger/50 transition-colors">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Problemas Abertos</h3>
            <p className="text-4xl font-black text-foreground">{openProblems}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center text-danger group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Charts */}
      <DashboardCharts ticketsData={chartData} assetsData={assetChartData} />
      
    </div>
  );
}
