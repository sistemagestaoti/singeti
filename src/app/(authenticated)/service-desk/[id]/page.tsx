import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { resolveCurrentUser } from "@/lib/currentUser";
import TicketDetailClient from "./TicketDetailClient";

export const dynamic = "force-dynamic";

export default async function TicketViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const currentUser = await resolveCurrentUser(session);

  const ticket = await prisma.ticket.findUnique({
    where: { id: resolvedParams.id },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        }
      },
      assigned_to: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        }
      },
      category: {
        select: {
          id: true,
          name: true,
        }
      },
      asset: {
        select: {
          id: true,
          name: true,
          internal_id: true,
          asset_tag: true,
          type: true,
        }
      },
      department: {
        select: {
          id: true,
          name: true,
        }
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          },
        },
        orderBy: {
          created_at: "asc"
        }
      }
    }
  });

  if (!ticket) {
    notFound();
  }

  // Load auxiliary data for in-place property editing
  const categories = await prisma.ticketCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  const assets = await prisma.asset.findMany({
    select: { id: true, name: true, internal_id: true, asset_tag: true },
    orderBy: { name: "asc" }
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });

  return (
    <TicketDetailClient
      initialTicket={ticket}
      categories={categories}
      departments={departments}
      assets={assets}
      users={users}
      currentUser={currentUser}
    />
  );
}
