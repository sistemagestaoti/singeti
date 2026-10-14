import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveCurrentUser } from "@/lib/currentUser";
import ServiceDeskClient from "./ServiceDeskClient";

export const dynamic = "force-dynamic";

export default async function ServiceDeskPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const currentUser = await resolveCurrentUser(session);

  // Auto-seed default categories if empty
  let categories = await prisma.ticketCategory.findMany({
    orderBy: { name: "asc" }
  });

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

  // Fetch all tickets with complete relations
  const tickets = await prisma.ticket.findMany({
    include: {
      requester: {
        select: { id: true, name: true, email: true, avatar: true }
      },
      assigned_to: {
        select: { id: true, name: true, email: true, avatar: true }
      },
      category: {
        select: { id: true, name: true }
      },
      department: {
        select: { id: true, name: true }
      },
      asset: {
        select: { id: true, name: true, internal_id: true, asset_tag: true }
      },
    },
    orderBy: { created_at: "desc" }
  });

  return (
    <ServiceDeskClient
      initialTickets={tickets}
      categories={categories}
      currentUser={currentUser}
    />
  );
}
