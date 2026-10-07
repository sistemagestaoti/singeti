import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Server, Monitor, Printer, Network } from "lucide-react";

export default async function CMDBPage() {
  const assets = await prisma.asset.findMany({
    include: {
      user: true,
      department: true
    },
    orderBy: { created_at: 'desc' }
  });

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
      
      {/* Table */}
      <div className="bg-surface shadow-sm border border-border rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-hover">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Código</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Dispositivo</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Usuário/Local</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhum ativo cadastrado na CMDB.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{asset.internal_id}</td>
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
                    <div className="text-xs text-muted-foreground mt-0.5">{asset.manufacturer} {asset.model}</div>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
