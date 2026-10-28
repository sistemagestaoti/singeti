import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(locations);
  } catch (error: any) {
    console.error("GET /api/locations error:", error);
    return NextResponse.json({ error: "Erro ao listar unidades" }, { status: 500 });
  }
}
