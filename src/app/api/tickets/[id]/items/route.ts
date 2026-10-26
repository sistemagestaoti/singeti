import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    const items = await prisma.ticketItem.findMany({
      where: { ticket_id: resolvedParams.id },
      include: { asset: true },
      orderBy: { created_at: "asc" }
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("GET /api/tickets/[id]/items error:", error);
    return NextResponse.json({ error: "Erro ao listar itens" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    const body = await req.json();

    if (!body.description || !body.description.trim()) {
      return NextResponse.json({ error: "A descrição do item é obrigatória" }, { status: 400 });
    }

    const item = await prisma.ticketItem.create({
      data: {
        ticket_id: resolvedParams.id,
        description: body.description.trim(),
        quantity: Math.max(1, parseInt(body.quantity, 10) || 1),
        category: body.category?.trim() || null,
        asset_id: body.asset_id || null,
        unit: body.unit?.trim() || 'UN',
        notes: body.notes?.trim() || null,
        status: body.status || 'PENDING'
      },
      include: {
        asset: true
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tickets/[id]/items error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao adicionar item ao chamado" }, { status: 500 });
  }
}
