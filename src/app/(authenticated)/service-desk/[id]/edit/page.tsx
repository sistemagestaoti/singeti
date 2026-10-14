import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import TicketForm from "../../new/TicketForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const resolvedParams = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: resolvedParams.id },
    include: {
      items: true,
      category: true,
      asset: true,
      department: true
    }
  });

  if (!ticket) {
    notFound();
  }

  const [categories, assets, departments] = await Promise.all([
    prisma.ticketCategory.findMany({ orderBy: { name: 'asc' } }),
    prisma.asset.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href={`/service-desk/${ticket.id}`}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1.5 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao chamado
            </Link>
            <h2 className="text-2xl font-bold text-foreground">
              Editar Chamado [{ticket.code}]
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Altere as informações, categoria, equipamentos e gerencie os itens do chamado.
            </p>
          </div>
        </div>

        <TicketForm 
          categories={categories} 
          assets={assets} 
          departments={departments}
          initialTicket={ticket}
        />
      </div>
    </div>
  );
}
