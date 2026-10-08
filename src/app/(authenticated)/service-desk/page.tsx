import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TicketIcon, Clock, AlertCircle } from "lucide-react";

import RowActions from "../problems/RowActions";

export default async function ServiceDeskPage() {
  const tickets = await prisma.ticket.findMany({
    include: {
      requester: true,
      assigned_to: true,
    },
    orderBy: { created_at: 'desc' }
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Service Desk</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie incidentes e requisições de serviço.</p>
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
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Título</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Prioridade</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Solicitante</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
          <tbody className="bg-surface divide-y divide-border">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhum chamado aberto.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{ticket.code}</td>
                  <td className="px-6 py-4 text-sm">
                    <Link href={`/service-desk/${ticket.id}`} className="font-semibold text-primary hover:underline">
                      {ticket.title}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                      ticket.status === 'NEW' ? 'bg-info/10 text-info border-info/20' :
                      ticket.status === 'IN_PROGRESS' ? 'bg-warning/10 text-warning border-warning/20' :
                      ticket.status === 'RESOLVED' ? 'bg-success/10 text-success border-success/20' :
                      'bg-muted text-muted-foreground border-border'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      ticket.priority === 'CRITICAL' ? 'text-danger' :
                      ticket.priority === 'HIGH' ? 'text-warning' :
                      'text-muted-foreground'
                    }`}>
                      {ticket.priority === 'CRITICAL' && <AlertCircle className="w-3 h-3" />}
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {ticket.requester.name}
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
