import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AssetForm from "../new/AssetForm";

export default async function EditAssetPage({ params }: { params: { id: string } }) {
  const [asset, companies, locations, departments, users] = await Promise.all([
    prisma.asset.findUnique({ where: { id: params.id }, include: { computer: true } }),
    prisma.company.findMany({ select: { id: true, corporate_name: true, name: true } }),
    prisma.location.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  if (!asset) notFound();

  const formattedCompanies = companies.map(c => ({ id: c.id, name: c.corporate_name || c.name }));

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">Editar Ativo - {asset.internal_id}</h2>
        <p className="text-sm text-muted-foreground mt-1">Atualize as informações do equipamento patrimoniado.</p>
      </div>

      <AssetForm 
        companies={formattedCompanies}
        locations={locations}
        departments={departments}
        users={users}
        initialData={asset}
        assetId={asset.id}
      />
    </div>
  );
}
