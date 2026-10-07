import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import TicketForm from "./TicketForm";

export default async function NewTicketPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Load necessary relations for dropdowns
  const categories = await prisma.ticketCategory.findMany();
  const assets = await prisma.asset.findMany();
  const departments = await prisma.department.findMany();

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Abertura de Chamado</h2>
        <TicketForm 
          categories={categories} 
          assets={assets} 
          departments={departments} 
        />
      </div>
    </div>
  );
}
