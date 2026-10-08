import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DetailClient from "./DetailClient";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const resolvedParams = await params;
  const record = await prisma.booking.findUnique({
    where: { id: resolvedParams.id }
  });

  if (!record) return <div>Registro não encontrado.</div>;

  return <DetailClient record={record} route="bookings" moduleName="Reserva" />;
}
