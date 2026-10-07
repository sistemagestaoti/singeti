import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import RoleManager from "./RoleManager";

export default async function RolesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const roles = await prisma.role.findMany({
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
        <h2 className="text-2xl font-bold text-foreground">Perfis de Acesso (Roles)</h2>
        <p className="text-sm text-muted-foreground mt-1">Crie perfis de permissão e defina o que cada grupo pode acessar no sistema.</p>
      </div>

      <RoleManager initialRoles={roles} />
    </div>
  );
}
