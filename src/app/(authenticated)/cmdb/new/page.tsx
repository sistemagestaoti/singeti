import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AssetForm from "./AssetForm";

export default async function NewAssetPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Buscar dados para popular os selects do formulário
  const companies = await prisma.company.findMany();
  const locations = await prisma.location.findMany();
  const departments = await prisma.department.findMany();

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Cadastrar Novo Ativo</h2>
        <AssetForm 
          companies={companies} 
          locations={locations} 
          departments={departments} 
        />
      </div>
    </div>
  );
}
