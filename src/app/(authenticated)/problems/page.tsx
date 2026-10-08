import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import RowActions from "./RowActions";

export default async function ProblemsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const problems = await prisma.problem.findMany({
    include: {
      assigned_to: true,
      department: true,
    },
    orderBy: { created_at: 'desc' }
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-surface p-6 rounded-2xl border border-border shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Problemas (ITIL)</h2>
          <p className="text-sm text-muted-foreground mt-1">Investigue e resolva a causa raiz de múltiplos incidentes.</p>
        </div>
        <Link 
          href="/problems/new" 
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Novo Problema
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
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Prioridade</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Responsável</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {problems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum problema registrado no momento.
                  </td>
                </tr>
              ) : (
                problems.map((problem) => (
                  <tr key={problem.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">{problem.code}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary hover:text-primary-hover transition-colors">
                      <Link href={`/problems/${problem.id}`}>{problem.title}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border ${
                        problem.status === 'OPEN' ? 'bg-danger/10 text-danger border-danger/20' :
                        problem.status === 'ANALYZING' ? 'bg-warning/10 text-warning border-warning/20' :
                        problem.status === 'RESOLVED' ? 'bg-success/10 text-success border-success/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>
                        {problem.status === 'OPEN' ? 'Aberto' : problem.status === 'ANALYZING' ? 'Analisando' : 'Resolvido'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{problem.priority}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{problem.assigned_to?.name || "Não atribuído"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                        <RowActions id={problem.id} route="problems" />
                      </td>
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
