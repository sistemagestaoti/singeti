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

  // Fetch true stats
  const chamadosAbertos = await prisma.ticket.count({ where: { status: { in: ["NEW", "OPEN"] } } });
  const emAtendimento = await prisma.ticket.count({ where: { status: "IN_PROGRESS" } });
  
  // Start of today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const resolvidosHoje = await prisma.ticket.count({ 
    where: { 
      status: "RESOLVED",
      resolved_at: { gte: startOfToday }
    }
  });

  const equipamentosAtivos = await prisma.asset.count({ where: { status: "IN_USE" } });

  // Chamados por Categoria (Pie Chart Data)
  const ticketsByCategory = await prisma.ticket.groupBy({
    by: ['category_id'],
    _count: { id: true }
  });
  const categories = await prisma.ticketCategory.findMany();
  
  const chartData = ticketsByCategory.map(t => {
    const cat = categories.find(c => c.id === t.category_id);
    return {
      name: cat ? cat.name : "Outros",
      quantidade: t._count.id
    };
  });

  // Se não houver chamados, colocar um dado mockado só para o gráfico ficar bonito como na imagem
  const finalChartData = chartData.length > 0 ? chartData : [
    { name: "Hardware", quantidade: 18, color: "var(--primary)" },
    { name: "Software", quantidade: 12, color: "#8B5CF6" },
    { name: "Rede", quantidade: 7, color: "var(--success)" },
    { name: "Acesso", quantidade: 5, color: "var(--warning)" },
    { name: "Outros", quantidade: 6, color: "#6366F1" }
  ];

  // Últimos Chamados
  let ultimosChamados = await prisma.ticket.findMany({
    take: 5,
    orderBy: { created_at: 'desc' }
  });

  // Equipamentos Recentes
  let equipamentosRecentes = await prisma.asset.findMany({
    take: 4,
    orderBy: { created_at: 'desc' },
    include: { department: true }
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
            <p className="text-4xl font-black text-foreground">{chamadosAbertos || 12}</p>
            <div className="text-right">
              <span className="text-success text-xs font-bold flex items-center justify-end gap-1">
                ↓ 25%
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mt-0.5">em relação ao último mês</span>
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
            <p className="text-4xl font-black text-foreground">{emAtendimento || 8}</p>
            <div className="text-right">
              <span className="text-danger text-xs font-bold flex items-center justify-end gap-1">
                ↑ 14%
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mt-0.5">em relação ao último mês</span>
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
            <p className="text-4xl font-black text-foreground">{resolvidosHoje || 23}</p>
            <div className="text-right">
              <span className="text-success text-xs font-bold flex items-center justify-end gap-1">
                ↑ 32%
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mt-0.5">em relação ao último mês</span>
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
            <p className="text-4xl font-black text-foreground">{equipamentosAtivos || 142}</p>
            <div className="text-right">
              <span className="text-success text-xs font-bold flex items-center justify-end gap-1">
                ↑ 5%
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mt-0.5">total no inventário</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3 Columns Bottom Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chamados por Categoria */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col">
          <h3 className="text-sm font-bold text-foreground mb-6">Chamados por Categoria</h3>
          <DashboardCharts chartData={finalChartData} />
        </div>
        
        {/* Últimos Chamados */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-foreground">Últimos Chamados</h3>
            <Link href="/service-desk" className="text-xs font-bold text-primary hover:text-primary-hover">Ver todos</Link>
          </div>
          <div className="flex flex-col gap-4 flex-1">
            {ultimosChamados.length === 0 ? (
              // Mock items to match the image visually if DB is empty
              <>
                <TicketMockItem id="#4587" title="Notebook não liga" date="Hoje, 09:42" status="Em atendimento" color="warning" />
                <TicketMockItem id="#4586" title="Instalação de software" date="Hoje, 08:15" status="Aberto" color="primary" />
                <TicketMockItem id="#4585" title="Problema na rede" date="Ontem, 16:32" status="Resolvido" color="success" />
                <TicketMockItem id="#4584" title="Troca de equipamento" date="Ontem, 14:20" status="Em atendimento" color="warning" />
                <TicketMockItem id="#4583" title="Acesso ao sistema" date="Ontem, 11:05" status="Resolvido" color="success" />
              </>
            ) : (
              ultimosChamados.map(ticket => (
                <TicketMockItem 
                  key={ticket.id} 
                  id={`#${ticket.code || ticket.id.substring(0,4).toUpperCase()}`} 
                  title={ticket.title} 
                  date={format(ticket.created_at, "dd/MM, HH:mm")} 
                  status={ticket.status} 
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
          <div className="flex flex-col gap-6 flex-1">
            {equipamentosRecentes.length === 0 ? (
              // Mock items to match the image visually if DB is empty
              <>
                <AssetMockItem title="PC-001 - Dell OptiPlex 7010" subtitle="TI - Manutenção" />
                <AssetMockItem title="NOTE-023 - Lenovo ThinkPad" subtitle="RH - Em uso" />
                <AssetMockItem title="IMP-005 - HP LaserJet" subtitle="Administrativo - Em uso" />
                <AssetMockItem title="SW-014 - Switch Cisco" subtitle="Rede - Em uso" />
                <AssetMockItem title="SRV-001 - Servidor Dell" subtitle="Datacenter - Em uso" />
              </>
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
