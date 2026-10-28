import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveCurrentUser } from "@/lib/currentUser";
import { getUnifiedRequesters } from "@/lib/requesters";
import { getUnifiedCatalogItems } from "@/lib/itemCatalog";
import ServiceDeskClient from "./ServiceDeskClient";

export const dynamic = "force-dynamic";

export default async function ServiceDeskPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Busca dados em paralelo simultâneo no servidor (reduz latência e elimina waterfalls do cliente)
  const [currentUser, categories, tickets, departments, attendants, assets, requesters, catalogItems] = await Promise.all([
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
      select: { 
        id: true, 
        name: true, 
        email: true,
        job_title: true,
        department: { select: { id: true, name: true } }
      },
      orderBy: { name: "asc" }
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
      orderBy: { name: "asc" }
    }),
    getUnifiedRequesters().catch(() => []),
    getUnifiedCatalogItems().catch(() => [])
  ]);

  return (
    <ServiceDeskClient
      initialTickets={tickets}
      categories={categories}
      currentUser={currentUser}
      departments={departments}
      attendants={attendants}
      initialAssets={assets}
      initialRequesters={requesters}
      initialCatalogItems={catalogItems}
    />
  );
}
