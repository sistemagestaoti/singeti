import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Server, Monitor, Printer, Network, ChevronLeft, ChevronRight } from "lucide-react";
import RowActions from "../problems/RowActions";
import CMDBFilters from "./CMDBFilters";

export default async function CMDBPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; type?: string; page?: string }
}) {
  const page = Number(searchParams.page) || 1;
  const take = 10;
  const skip = (page - 1) * take;

  const where: any = {};
  
  if (searchParams.q) {
    where.OR = [
      { name: { contains: searchParams.q } },
      { asset_tag: { contains: searchParams.q } },
      { serial_number: { contains: searchParams.q } },
    ];
  }

  if (searchParams.status) {
    where.status = searchParams.status;
  }

  if (searchParams.type) {
    where.type = searchParams.type;
  }

  const [assets, totalCount] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        user: true,
        department: true,
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.asset.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inventário Corporativo (CMDB)</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todos os hardwares, dispositivos e ativos da organização.</p>
        </div>
        <Link 
          href="/cmdb/new" 
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm"
        >
          + Cadastrar Ativo
        </Link>
      </div>

      <CMDBFilters />
      
      {/* Table */}
      <div className="bg-surface shadow-sm border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Patrimônio</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Equipamento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Responsável/Local</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum ativo encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {asset.asset_tag || asset.internal_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        {asset.type === 'COMPUTER' && <Monitor className="w-4 h-4" />}
                        {asset.type === 'PRINTER' && <Printer className="w-4 h-4" />}
                        {asset.type === 'NETWORK' && <Network className="w-4 h-4" />}
                        {asset.type === 'OTHER' && <Server className="w-4 h-4" />}
                        {asset.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link href={`/cmdb/${asset.id}`} className="font-semibold text-primary hover:underline">
                        {asset.name}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {asset.manufacturer} {asset.model} {asset.serial_number ? `(S/N: ${asset.serial_number})` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                        asset.status === 'IN_USE' ? 'bg-success/10 text-success border-success/20' :
                        asset.status === 'IN_STOCK' ? 'bg-info/10 text-info border-info/20' :
                        asset.status === 'MAINTENANCE' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>
                        {asset.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {asset.user?.name || asset.department?.name || "Não atribuído"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <RowActions id={asset.id} route="assets" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-surface-hover px-6 py-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Mostrando {skip + 1} até {Math.min(skip + take, totalCount)} de {totalCount} ativos
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link href={`/cmdb?page=${page - 1}${searchParams.q ? `&q=${searchParams.q}` : ''}`} className="p-2 border border-border rounded bg-surface hover:bg-surface-hover text-foreground">
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              ) : (
                <button disabled className="p-2 border border-border/50 rounded bg-surface/50 text-muted-foreground cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              
              <span className="text-sm font-medium px-4">Página {page} de {totalPages}</span>

              {page < totalPages ? (
                <Link href={`/cmdb?page=${page + 1}${searchParams.q ? `&q=${searchParams.q}` : ''}`} className="p-2 border border-border rounded bg-surface hover:bg-surface-hover text-foreground">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <button disabled className="p-2 border border-border/50 rounded bg-surface/50 text-muted-foreground cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
