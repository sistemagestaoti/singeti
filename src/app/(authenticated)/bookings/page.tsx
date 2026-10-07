import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const bookings = await prisma.booking.findMany({
    include: {
      user: true,
      asset: true,
    },
    orderBy: { start_time: 'asc' }
  });

  return (
    <div className="flex-1">
      

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Agenda e Reservas de Ativos</h2>
            <Link 
              href="/bookings/new" 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              + Nova Reserva
            </Link>
          </div>

          <div className="bg-card shadow-sm border border-border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ativo (Equipamento/Sala)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Solicitante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Início</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Fim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      Nenhuma reserva ativa no momento.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary hover:underline">
                        <Link href={`/cmdb/${booking.asset.id}`}>{booking.asset.name}</Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{booking.user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(booking.start_time).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(booking.end_time).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          booking.status === 'APPROVED' || booking.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-muted text-card-foreground'
                        }`}>
                          {booking.status}
                        </span>
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
