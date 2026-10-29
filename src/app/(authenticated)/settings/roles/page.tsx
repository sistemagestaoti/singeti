import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import RoleManager from "./RoleManager";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Perfis de Acesso (Roles)</h2>
          <p className="text-sm text-muted-foreground mt-1">Crie perfis de permissão e defina o que cada grupo pode acessar no sistema.</p>
        </div>
        <Link
          href="/users"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-hover hover:bg-muted border border-border text-xs font-bold text-foreground transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <Users className="w-4 h-4 text-primary" />
          <span>Voltar para Usuários</span>
        </Link>
      </div>

      <RoleManager initialRoles={roles} />
    </div>
  );
}
