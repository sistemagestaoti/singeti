import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import RowActions from "./RowActions";

export default async function SuppliersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const suppliers = await prisma.supplier.findMany({
    include: {
      contracts: true,
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="flex-1">
      

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Catálogo de Fornecedores</h2>
            <Link 
              href="/suppliers/new" 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              + Novo Fornecedor
            </Link>
          </div>
          
          <div className="bg-card shadow-sm border border-border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fornecedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato / Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Contratos Ativos</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
              <tbody className="bg-card divide-y divide-border">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                      Nenhum fornecedor cadastrado.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        <div className="font-medium text-primary hover:underline">
                          <Link href={`/suppliers/${supplier.id}`}>{supplier.name}</Link>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">CNPJ: {supplier.cnpj || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div>{supplier.contact_name || '-'}</div>
                        <div className="text-xs">{supplier.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          supplier.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          supplier.status === 'BLACKLISTED' ? 'bg-red-100 text-red-800' :
                          'bg-muted text-card-foreground'
                        }`}>
                          {supplier.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-accent px-2.5 py-0.5 text-accent-foreground font-medium">
                          {supplier.contracts.filter(c => c.status === 'ACTIVE').length}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <RowActions id={supplier.id} route="suppliers" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
