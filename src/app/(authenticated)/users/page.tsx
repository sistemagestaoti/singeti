import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserIcon, Shield, Briefcase } from "lucide-react";
import UserRowActions from "./UserRowActions";
import Image from "next/image";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
      department: true,
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os acessos, cargos e departamentos dos colaboradores.</p>
        </div>
        <Link 
          href="/users/new" 
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm"
        >
          + Novo Usuário
        </Link>
      </div>
      
      {/* Table */}
      <div className="bg-surface shadow-sm border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Cargo / Setor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden flex-shrink-0">
                          {u.avatar ? (
                            <Image src={u.avatar} alt={u.name} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            u.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground">ID: {u.id.substring(0,8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-foreground">{u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-foreground font-medium flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-muted-foreground" />
                        {u.job_title || 'Não definido'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{u.department?.name || 'Sem departamento'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        <Shield className="w-3 h-3" />
                        {u.role.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                        u.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' :
                        u.status === 'INACTIVE' ? 'bg-danger/10 text-danger border-danger/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>
                        {u.status === 'ACTIVE' ? 'Ativo' : u.status === 'INACTIVE' ? 'Inativo' : 'Externo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <UserRowActions user={{ id: u.id, status: u.status, name: u.name }} />
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
