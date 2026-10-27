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

  // Busca usuário atual, categorias, chamados, departamentos e usuários em paralelo (reduz latência sequencial de rede)
  const [currentUser, categories, tickets, departments, attendants] = await Promise.all([
    resolveCurrentUser(session),
    prisma.ticketCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.ticket.findMany({
      take: 100,
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        assigned_to: {
          select: { id: true, name: true, email: true }
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
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <ServiceDeskClient
      initialTickets={tickets}
      categories={categories}
      currentUser={currentUser}
      departments={departments}
      attendants={attendants}
    />
  );
}
