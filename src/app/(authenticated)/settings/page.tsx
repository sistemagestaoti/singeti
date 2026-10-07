import Link from "next/link";
import { Building2, ShieldCheck, Users } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">Configurações do Sistema</h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie a estrutura organizacional e as políticas de acesso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <Link href="/settings/departments" className="group bg-surface hover:bg-surface-hover transition-colors p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Departamentos</h3>
            <p className="text-sm text-muted-foreground mt-1">Crie e gerencie os departamentos e áreas da empresa.</p>
          </div>
        </Link>

        <Link href="/settings/roles" className="group bg-surface hover:bg-surface-hover transition-colors p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Perfis de Acesso (Roles)</h3>
            <p className="text-sm text-muted-foreground mt-1">Configure os perfis de segurança e o que cada grupo pode acessar no sistema.</p>
          </div>
        </Link>

        <Link href="/users" className="group bg-surface hover:bg-surface-hover transition-colors p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Usuários</h3>
            <p className="text-sm text-muted-foreground mt-1">Vincule os colaboradores aos departamentos e perfis criados.</p>
          </div>
        </Link>

      </div>
    </div>
  );
}
