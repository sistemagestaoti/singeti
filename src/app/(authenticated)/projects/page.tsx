import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";

import RowActions from "./RowActions";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const projects = await prisma.project.findMany({
    include: {
      manager: true,
      tasks: true,
    },
    orderBy: { created_at: 'desc' }
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-surface p-6 rounded-2xl border border-border shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Portfólio de Projetos de TI</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os projetos estratégicos, cronogramas e entregas.</p>
        </div>
        <Link 
          href="/projects/new" 
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2"
        >
          <Briefcase className="w-4 h-4" />
          Novo Projeto
        </Link>
      </div>
      
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-surface rounded-2xl border border-border shadow-sm">
            <p className="text-muted-foreground font-semibold">Nenhum projeto ativo no momento.</p>
          </div>
        ) : (
          projects.map((project) => {
            const totalTasks = project.tasks.length;
            const completedTasks = project.tasks.filter(t => t.status === 'DONE').length;
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return (
              <div key={project.id} className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-foreground truncate max-w-[70%]">
                    <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">{project.name}</Link>
                  </h3>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                    project.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' :
                    project.status === 'PLANNING' ? 'bg-info/10 text-info border-info/20' :
                    'bg-muted text-muted-foreground border-border'
                  }`}>
                    {project.status === 'ACTIVE' ? 'Ativo' : project.status === 'PLANNING' ? 'Planejando' : 'Finalizado'}
                  </span>
                </div>
                
                <p className="mt-1 text-sm font-medium text-muted-foreground line-clamp-2">{project.description}</p>
                
                <div className="mt-6 flex-1">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    <span>Progresso das Tarefas</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
                
                <div className="mt-6 border-t border-border pt-4 flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Gerente: <span className="font-bold text-foreground">{project.manager.name}</span>
                  </div>
                  <Link href={`/projects/${project.id}`} className="text-sm font-bold text-primary hover:text-primary-hover transition-colors">
                    Acessar &rarr;
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
