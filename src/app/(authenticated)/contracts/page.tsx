import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FileText, AlertTriangle } from "lucide-react";

export default async function ContractsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const contracts = await prisma.contract.findMany({
    include: {
      supplier: true,
      manager: true,
    },
    orderBy: { end_date: 'asc' }
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-surface p-6 rounded-2xl border border-border shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Contratos</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os contratos financeiros e licenças com seus fornecedores.</p>
        </div>
        <Link 
          href="/contracts/new" 
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Novo Contrato
        </Link>
      </div>
      
      {/* Table */}
      <div className="bg-surface shadow-sm border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Código / Fornecedor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum contrato cadastrado.
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => {
                  const isExpiring = new Date(contract.end_date).getTime() - new Date().getTime() < contract.renewal_notice_days * 24 * 60 * 60 * 1000;
                  
                  return (
                    <tr key={contract.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-primary hover:text-primary-hover transition-colors">
                          <Link href={`/contracts/${contract.id}`}>{contract.code} - {contract.title}</Link>
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground mt-1 uppercase">{contract.supplier.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{contract.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center gap-1.5 ${isExpiring ? "text-danger font-bold" : "text-muted-foreground"}`}>
                          {isExpiring && <AlertTriangle className="w-3.5 h-3.5" />}
                          {new Date(contract.end_date).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {contract.total_value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: contract.currency }).format(contract.total_value) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border ${
                          contract.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' :
                          contract.status === 'EXPIRED' ? 'bg-danger/10 text-danger border-danger/20' :
                          'bg-muted text-muted-foreground border-border'
                        }`}>
                          {contract.status === 'ACTIVE' ? 'Ativo' : contract.status === 'EXPIRED' ? 'Expirado' : 'Cancelado'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
