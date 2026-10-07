import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import TicketTimeline from "./TicketTimeline";

export default async function TicketViewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      requester: true,
      assigned_to: true,
      category: true,
      asset: true,
      department: true,
      comments: {
        include: {
          author: true,
        },
        orderBy: {
          created_at: 'asc'
        }
      }
    }
  });

  if (!ticket) {
    return <div>Chamado não encontrado.</div>;
  }

  return (
    <div className="flex-1 space-y-6">
      
      <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-foreground">[{ticket.code}] {ticket.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">Chamado criado em {ticket.created_at.toLocaleString('pt-BR')}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold border ${
          ticket.status === 'NEW' ? 'bg-info/10 text-info border-info/20' :
          ticket.status === 'IN_PROGRESS' ? 'bg-warning/10 text-warning border-warning/20' :
          ticket.status === 'RESOLVED' ? 'bg-success/10 text-success border-success/20' :
          ticket.status === 'CLOSED' ? 'bg-success/20 text-success border-success/40' :
          'bg-muted text-muted-foreground border-border'
        }`}>
          {ticket.status}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content: Description and Timeline */}
        <div className="flex-1 space-y-6">
          <div className="bg-surface shadow-sm rounded-xl border border-border p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Descrição Original</h3>
            <div className="prose max-w-none text-foreground whitespace-pre-wrap bg-background p-4 rounded-lg border border-border">
              {ticket.description}
            </div>
          </div>

          <TicketTimeline ticketId={ticket.id} comments={ticket.comments} currentUser={session.user} currentStatus={ticket.status} />
        </div>

        {/* Sidebar: Details */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-surface shadow-sm rounded-xl border border-border p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Propriedades</h3>
            
            <dl className="space-y-5">
              <div>
                <dt className="text-xs font-bold text-muted-foreground uppercase">Solicitante</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{ticket.requester.name}</dd>
              </div>
              
              <div>
                <dt className="text-xs font-bold text-muted-foreground uppercase">Atendente Técnico</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{ticket.assigned_to?.name || 'Não atribuído'}</dd>
              </div>
              
              <div className="pt-4 border-t border-border">
                <dt className="text-xs font-bold text-muted-foreground uppercase">Tipo</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{ticket.type === 'INCIDENT' ? 'Incidente' : 'Requisição'}</dd>
              </div>

              <div>
                <dt className="text-xs font-bold text-muted-foreground uppercase">Prioridade</dt>
                <dd className={`mt-1 text-sm font-bold ${
                  ticket.priority === 'CRITICAL' ? 'text-danger' :
                  ticket.priority === 'HIGH' ? 'text-warning' :
                  'text-foreground'
                }`}>
                  {ticket.priority}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold text-muted-foreground uppercase">Urgência / Impacto</dt>
                <dd className="mt-1 text-sm text-foreground">{ticket.urgency} / {ticket.impact}</dd>
              </div>
              
              <div className="pt-4 border-t border-border">
                <dt className="text-xs font-bold text-muted-foreground uppercase">Ativo Relacionado</dt>
                <dd className="mt-1 text-sm font-medium">
                  {ticket.asset ? (
                    <Link href={`/cmdb/${ticket.asset.id}`} className="text-primary hover:underline">
                      {ticket.asset.name}
                    </Link>
                  ) : <span className="text-muted-foreground">Nenhum</span>}
                </dd>
              </div>
              
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
