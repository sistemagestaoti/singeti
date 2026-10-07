import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";

export default async function ChangesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const changes = await prisma.change.findMany({
    include: {
      requester: true,
      manager: true,
    },
    orderBy: { created_at: 'desc' }
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-surface p-6 rounded-2xl border border-border shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Mudanças (RFC)</h2>
          <p className="text-sm text-muted-foreground mt-1">Planeje, aprove e implemente mudanças controladas na infraestrutura.</p>
        </div>
        <Link 
          href="/changes/new" 
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Nova Requisição
        </Link>
      </div>
      
      {/* Table */}
      <div className="bg-surface shadow-sm border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Título</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Risco</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Solicitante</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {changes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhuma requisição de mudança (RFC) registrada.
                  </td>
                </tr>
              ) : (
                changes.map((change) => (
                  <tr key={change.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">{change.code}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary hover:text-primary-hover transition-colors">
                      <Link href={`/changes/${change.id}`}>{change.title}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border ${
                        change.status === 'REQUESTED' ? 'bg-info/10 text-info border-info/20' :
                        change.status === 'APPROVED' ? 'bg-success/10 text-success border-success/20' :
                        change.status === 'REJECTED' ? 'bg-danger/10 text-danger border-danger/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>
                        {change.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{change.risk}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{change.requester.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
