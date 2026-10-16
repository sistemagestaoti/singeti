import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserManager from "./UserManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [users, roles, departments, distinctJobs, currentUser, defaultCompany] = await Promise.all([
    prisma.user.findMany({
      include: {
        role: true,
        department: true,
      },
      orderBy: { name: 'asc' }
    }),
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
    prisma.company.findFirst({ select: { id: true } }),
  ]);

  const jobTitles = distinctJobs.map(j => j.job_title).filter(Boolean) as string[];
  const companyId = currentUser?.company_id || defaultCompany?.id || "";

  return (
    <UserManager 
      initialUsers={JSON.parse(JSON.stringify(users))}
      roles={JSON.parse(JSON.stringify(roles))}
      departments={JSON.parse(JSON.stringify(departments))}
      jobTitles={jobTitles}
      companyId={companyId}
    />
  );
}
