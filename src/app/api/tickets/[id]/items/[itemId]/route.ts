import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string, itemId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.quantity !== undefined) updateData.quantity = Math.max(1, parseInt(body.quantity, 10) || 1);
    if (body.category !== undefined) updateData.category = body.category?.trim() || null;
    if (body.asset_id !== undefined) updateData.asset_id = body.asset_id || null;
    if (body.unit !== undefined) updateData.unit = body.unit?.trim() || 'UN';
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.status !== undefined) updateData.status = body.status;

    const item = await prisma.ticketItem.update({
      where: {
        id: resolvedParams.itemId,
        ticket_id: resolvedParams.id
      },
      data: updateData,
      include: {
        asset: true
      }
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("PATCH /api/tickets/[id]/items/[itemId] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar item do chamado" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, itemId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    await prisma.ticketItem.delete({
      where: {
        id: resolvedParams.itemId,
        ticket_id: resolvedParams.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/tickets/[id]/items/[itemId] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao excluir item do chamado" }, { status: 500 });
  }
}
