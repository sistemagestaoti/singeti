import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserForm from "../new/UserForm";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const resolvedParams = await params;

  const user = await prisma.user.findUnique({
    where: { id: resolvedParams.id }
  });

  if (!user) {
    redirect("/users");
  }

  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  
  const distinctJobs = await prisma.user.findMany({
    where: { job_title: { not: null } },
    select: { job_title: true },
    distinct: ['job_title'],
    orderBy: { job_title: 'asc' }
  });
  const jobTitles = distinctJobs.map(j => j.job_title).filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">Editar Usuário</h2>
        <p className="text-sm text-muted-foreground mt-1">Atualize as informações, foto de perfil e permissões do colaborador.</p>
      </div>
      
      <UserForm 
        roles={roles} 
        departments={departments} 
        jobTitles={jobTitles}
        companyId={user.company_id}
        initialData={user}
      />
    </div>
  );
}
