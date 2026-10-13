import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DepartmentManager from "./DepartmentManager";

export default async function DepartmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  let companyId: string = "default";
  try {
    if (session.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { company_id: true }
      });
      if (user?.company_id) {
        companyId = user.company_id;
      }
    }
  } catch (err) {
    console.warn("Aviso ao buscar empresa do usuário:", err);
  }

  if (companyId === "default") {
    const defaultCompany = await prisma.company.findFirst();
    if (defaultCompany?.id) {
      companyId = defaultCompany.id;
    }
  }

  const departments = await prisma.department.findMany({
    where: { company_id: companyId },
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

      <DepartmentManager initialDepartments={departments} companyId={companyId} />
    </div>
  );
}
