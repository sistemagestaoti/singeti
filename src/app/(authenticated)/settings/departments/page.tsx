import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DepartmentManager from "./DepartmentManager";

export default async function DepartmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { company_id: true }
  });

  if (!user) redirect("/login");

  const departments = await prisma.department.findMany({
    where: { company_id: user.company_id },
    include: {
      _count: {
        select: { users: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">Departamentos</h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie os departamentos organizacionais da empresa.</p>
      </div>

      <DepartmentManager initialDepartments={departments} companyId={user.company_id} />
    </div>
  );
}
