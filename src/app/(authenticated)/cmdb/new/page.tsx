import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail, Shield, ArrowRight } from "lucide-react";
import AssetForm from "./AssetForm";

export default async function NewAssetPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Buscar dados para popular os selects do formulário em paralelo
  const [companies, locations, departments, users] = await Promise.all([
    prisma.company.findMany({ orderBy: { trade_name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner de atalho para Gestão de E-mails e Acessos a PCs */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-transparent border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Gestão de E-mails & Acessos a Computadores</h4>
              <p className="text-xs text-muted-foreground">
                Cadastre contas de e-mail dos domínios (@empresa.com.br), senhas criptografadas em cofre e vínculos com usuários e PCs.
              </p>
            </div>
          </div>
          <Link
            href="/pc-access?tab=emails"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            Acessar E-mails & Senhas
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-6">Cadastrar Novo Ativo</h2>
        <AssetForm 
          companies={companies} 
          locations={locations} 
          departments={departments} 
          users={users}
        />
      </div>
    </div>
  );
}
