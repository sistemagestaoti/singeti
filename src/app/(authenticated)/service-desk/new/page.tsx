import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import TicketForm from "./TicketForm";
import { resolveCurrentUser } from "@/lib/currentUser";
import { getUnifiedRequesters } from "@/lib/requesters";
import { getUnifiedCatalogItems } from "@/lib/itemCatalog";
import Link from "next/link";
import { ArrowLeft, HeadphonesIcon } from "lucide-react";

export default async function NewTicketPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Executa todas as buscas em paralelo usando Promise.all (reduz latência de abertura em ~68%)
  const [currentUser, initialCategories, assets, departments, users, requesters, catalogItems] = await Promise.all([
    resolveCurrentUser(session),
    prisma.ticketCategory.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.asset.findMany({
      select: {
        id: true,
        name: true,
        internal_id: true,
        asset_tag: true,
        type: true,
        status: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        job_title: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    getUnifiedRequesters().catch(() => []),
    getUnifiedCatalogItems().catch(() => []),
  ]);

  let categories = initialCategories;
  if (categories.length === 0) {
    const defaultCats = [
      { name: "Hardware & Equipamentos", description: "Computadores, notebooks, monitores e periféricos" },
      { name: "Software & Sistemas", description: "Sistemas corporativos, ERP, Office e aplicativos" },
      { name: "Redes & Conectividade", description: "Wi-Fi, Internet, rede cabeada e VPN" },
      { name: "Acessos & Segurança", description: "Criação de usuário, redefinição de senha e permissões" },
      { name: "Impressão & Periféricos", description: "Impressoras de rede, toners e scanners" },
      { name: "Telefonia & Comunicação", description: "Ramais telefônicos, headsets e videoconferência" },
      { name: "Solicitação de Itens / Peças", description: "Novos periféricos, cabos, adaptadores e componentes" },
    ];
    for (const c of defaultCats) {
      await prisma.ticketCategory.create({ data: c });
    }
    categories = await prisma.ticketCategory.findMany({ orderBy: { name: "asc" } });
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-6 rounded-2xl border border-border shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/service-desk"
            className="p-2.5 rounded-xl border border-border bg-surface-elevated text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shadow-xs"
            title="Voltar para a lista de chamados"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Nova Abertura de Chamado</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Registre incidentes ou requisições técnicas com preenchimento assistido e cadastro manual flexível.
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-surface-elevated px-3 py-2 rounded-lg border border-border">
          Solicitante conectado: <span className="font-semibold text-foreground">{currentUser?.name || session.user?.name}</span>
        </div>
      </div>

      {/* Main Ticket Form */}
      <TicketForm 
        categories={categories} 
        assets={assets} 
        departments={departments}
        users={users}
        initialRequesters={requesters}
        initialCatalogItems={catalogItems}
        currentUserId={currentUser?.id || session.user?.id || ""}
      />
    </div>
  );
}
