import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TicketIcon, Clock, AlertCircle, Package } from "lucide-react";
import RowActions from "../problems/RowActions";

export default async function ServiceDeskPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = (session.user?.role || "").toUpperCase();
  const isRegularUser = userRole === "USUARIO" || userRole === "USER";

  const whereClause: any = {};
  if (isRegularUser && session.user?.id) {
    whereClause.requester_id = session.user.id;
  }

  const tickets = await prisma.ticket.findMany({
    where: whereClause,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assigned_to: { select: { id: true, name: true, email: true } },
      items: { select: { id: true } },
    },
    orderBy: { created_at: 'desc' }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">Novo</span>;
      case 'OPEN':
        return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20">Aberto</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">Em Atendimento</span>;
      case 'WAITING_USER':
        return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">Aguardando Usuário</span>;
      case 'WAITING_VENDOR':
      case 'WAITING_SUPPLIER':
        return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">Aguardando Fornecedor</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Resolvido</span>;
      case 'CLOSED':
        return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">Fechado</span>;
      case 'CANCELED':
      case 'CANCELLED':
        return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">Cancelado</span>;
      default:
        return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-muted text-muted-foreground border border-border">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Service Desk</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie incidentes e requisições de serviço de TI.</p>
        </div>
        <Link 
          href="/service-desk/new" 
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm"
        >
          + Abrir Chamado
        </Link>
      </div>
      
      {/* Table */}
      <div className="bg-surface shadow-sm border border-border rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-hover">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Código</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Título / Descrição</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Prioridade</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Solicitante</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Atendente</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhum chamado registrado no momento.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                    <Link href={`/service-desk/${ticket.id}`} className="hover:underline">
                      {ticket.code}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Link href={`/service-desk/${ticket.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">
                        {ticket.title}
                      </Link>
                      {ticket.items && ticket.items.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary" title={`${ticket.items.length} itens vinculados`}>
                          <Package className="w-3 h-3" />
                          {ticket.items.length}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(ticket.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      ticket.priority === 'CRITICAL' ? 'text-red-500 font-bold' :
                      ticket.priority === 'HIGH' ? 'text-amber-500 font-bold' :
                      ticket.priority === 'MEDIUM' ? 'text-blue-500' :
                      'text-muted-foreground'
                    }`}>
                      {ticket.priority === 'CRITICAL' && <AlertCircle className="w-3 h-3 text-red-500" />}
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {ticket.requester?.name || 'Não informado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {ticket.assigned_to?.name || <span className="text-muted-foreground/60 italic">Não atribuído</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <RowActions id={ticket.id} route="tickets" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
