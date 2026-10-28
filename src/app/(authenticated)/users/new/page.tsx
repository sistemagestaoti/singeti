import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserForm from "./UserForm";

export default async function NewUserPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [roles, departments, distinctJobs, currentUser, defaultCompany] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { job_title: { not: null } },
      select: { job_title: true },
      distinct: ['job_title'],
      orderBy: { job_title: 'asc' }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { company_id: true }
    }),
    prisma.company.findFirst(),
  ]);

  const jobTitles = distinctJobs.map(j => j.job_title).filter(Boolean) as string[];
  const companyId = currentUser?.company_id || defaultCompany?.id || "";

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">Novo Usuário</h2>
        <p className="text-sm text-muted-foreground mt-1">Cadastre um novo colaborador ou prestador de serviço.</p>
      </div>
      
      <UserForm 
        roles={JSON.parse(JSON.stringify(roles))} 
        departments={JSON.parse(JSON.stringify(departments))} 
        jobTitles={jobTitles}
        companyId={companyId}
      />
    </div>
  );
}
