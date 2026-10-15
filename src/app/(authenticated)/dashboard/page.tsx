import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MessageSquare, Clock, CheckCircle2, Monitor, Cloud, CloudRain } from "lucide-react";
import DashboardCharts from "./DashboardCharts";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userName = session.user.name ? session.user.name.split(' ')[0] : 'Usuário';
  const currentDate = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  // Capitalize first letter
  const formattedDate = currentDate.charAt(0).toUpperCase() + currentDate.slice(1);

  // Start of today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Execução de consultas simultâneas em paralelo (reduz latência em até 80%)
  const [
    chamadosAbertos,
    emAtendimento,
    resolvidosHoje,
    equipamentosAtivos,
    ticketsByCategory,
    categories,
    ultimosChamados,
    equipamentosRecentes,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: { in: ["NEW", "OPEN"] } } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({
      where: {
        status: "RESOLVED",
        resolved_at: { gte: startOfToday },
      },
    }),
    prisma.asset.count({ where: { status: "IN_USE" } }),
    prisma.ticket.groupBy({
      by: ["category_id"],
      _count: { id: true },
    }),
    prisma.ticketCategory.findMany(),
    prisma.ticket.findMany({
      take: 5,
      orderBy: { created_at: "desc" },
    }),
    prisma.asset.findMany({
      take: 4,
      orderBy: { created_at: "desc" },
      include: { department: true },
    }),
  ]);

  const chartData = ticketsByCategory.map((t) => {
    const cat = categories.find((c) => c.id === t.category_id);
    return {
      name: cat ? cat.name : "Outros",
      quantidade: t._count.id,
    };
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header Profile / Date */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Olá, {userName}!</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Bem-vindo ao SYNGETI. Aqui está um resumo da sua operação de TI.</p>
        </div>
        <div className="flex flex-col items-end text-right">
          <p className="text-sm font-medium text-muted-foreground capitalize">{formattedDate}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-bold text-foreground">{format(new Date(), "HH:mm")}</span>
            <div className="flex items-center gap-1.5 text-info">
              <CloudRain className="w-5 h-5" />
              <span className="text-sm font-bold text-foreground">24ºC</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Chamados Abertos */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col group hover:border-primary/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-[0_0_15px_rgba(23,101,245,0.4)]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Chamados Abertos</h3>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-black text-foreground">{chamadosAbertos}</p>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">tempo real</span>
            </div>
          </div>
        </div>

        {/* Em Atendimento */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col group hover:border-[#8B5CF6]/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Em Atendimento</h3>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-black text-foreground">{emAtendimento}</p>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">em andamento</span>
            </div>
          </div>
        </div>

        {/* Resolvidos Hoje */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col group hover:border-success/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Resolvidos Hoje</h3>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-black text-foreground">{resolvidosHoje}</p>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">hoje</span>
            </div>
          </div>
        </div>

        {/* Equipamentos Ativos */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col group hover:border-info/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-info flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,213,242,0.4)]">
              <Monitor className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Equipamentos Ativos</h3>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-black text-foreground">{equipamentosAtivos}</p>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">no inventário</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3 Columns Bottom Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chamados por Categoria */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col">
          <h3 className="text-sm font-bold text-foreground mb-6">Chamados por Categoria</h3>
          <DashboardCharts chartData={chartData} />
        </div>
        
        {/* Últimos Chamados */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-foreground">Últimos Chamados</h3>
            <Link href="/service-desk" className="text-xs font-bold text-primary hover:text-primary-hover">Ver todos</Link>
          </div>
          <div className="flex flex-col gap-4 flex-1 justify-center">
            {ultimosChamados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Nenhum chamado registrado</p>
                <p className="text-xs text-muted-foreground mt-0.5">Os novos chamados aparecerão aqui.</p>
              </div>
            ) : (
              ultimosChamados.map(ticket => (
                <TicketMockItem 
                  key={ticket.id} 
                  id={`#${ticket.code || ticket.id.substring(0,4).toUpperCase()}`} 
                  title={ticket.title} 
                  date={format(ticket.created_at, "dd/MM, HH:mm")} 
                  status={ticket.status === 'RESOLVED' ? 'Resolvido' : ticket.status === 'IN_PROGRESS' ? 'Em atendimento' : 'Aberto'} 
                  color={ticket.status === 'RESOLVED' ? 'success' : ticket.status === 'IN_PROGRESS' ? 'warning' : 'primary'} 
                />
              ))
            )}
          </div>
        </div>

        {/* Equipamentos Recentes */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-foreground">Equipamentos Recentes</h3>
            <Link href="/cmdb" className="text-xs font-bold text-primary hover:text-primary-hover">Ver todos</Link>
          </div>
          <div className="flex flex-col gap-6 flex-1 justify-center">
            {equipamentosRecentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Monitor className="w-8 h-8 mb-2 opacity-30 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Nenhum equipamento registrado</p>
                <p className="text-xs text-muted-foreground mt-0.5">Os ativos cadastrados no inventário aparecerão aqui.</p>
              </div>
            ) : (
              equipamentosRecentes.map(asset => (
                <AssetMockItem 
                  key={asset.id} 
                  title={`${asset.asset_tag || asset.id.substring(0,6).toUpperCase()} - ${asset.name}`} 
                  subtitle={`${asset.department?.name || 'Geral'} - ${asset.status.replace('_', ' ')}`} 
                />
              ))
            )}
          </div>
        </div>

      </div>
      
    </div>
  );
}

function TicketMockItem({ id, title, date, status, color }: { id: string, title: string, date: string, status: string, color: 'primary' | 'warning' | 'success' }) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{id}</span>
          <span className="text-sm font-medium text-foreground truncate max-w-[150px]">{title}</span>
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5">{date}</span>
      </div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded border ${colorClasses[color]}`}>
        {status}
      </span>
    </div>
  );
}

function AssetMockItem({ title, subtitle }: { title: string, subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground">
        <Monitor className="w-5 h-5" />
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground mt-0.5">{subtitle}</span>
      </div>
      <div className="w-2 h-2 rounded-full bg-success"></div>
    </div>
  );
}
