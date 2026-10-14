import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: resolvedParams.id },
      include: {
        requester: { select: { id: true, name: true, email: true, avatar: true } },
        assigned_to: { select: { id: true, name: true, email: true, avatar: true } },
        category: true,
        asset: true,
        department: true,
        items: {
          include: { asset: true },
          orderBy: { created_at: 'asc' }
        },
        comments: {
          include: { author: { select: { id: true, name: true, avatar: true } } },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error("GET /api/tickets/[id] error:", error);
    return NextResponse.json({ error: "Erro ao buscar chamado" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.type !== undefined) updateData.type = body.type;
    if (body.urgency !== undefined) updateData.urgency = body.urgency;
    if (body.impact !== undefined) updateData.impact = body.impact;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assigned_to_id !== undefined) updateData.assigned_to_id = body.assigned_to_id || null;
    if (body.group_id !== undefined) updateData.group_id = body.group_id || null;
    if (body.category_id !== undefined) updateData.category_id = body.category_id || null;
    if (body.asset_id !== undefined) updateData.asset_id = body.asset_id || null;

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'RESOLVED') {
        updateData.resolved_at = new Date();
      } else if (body.status === 'CLOSED') {
        updateData.closed_at = new Date();
      }
    }

    // Se uma lista de itens for passada na atualização, sincroniza sem deletar os existentes caso correspondam
    if (Array.isArray(body.items)) {
      // Deleta itens antigos e recria os novos em transação segura
      await prisma.$transaction([
        prisma.ticketItem.deleteMany({ where: { ticket_id: resolvedParams.id } }),
        prisma.ticketItem.createMany({
          data: body.items
            .filter((it: any) => it && it.description && it.description.trim())
            .map((it: any) => ({
              ticket_id: resolvedParams.id,
              description: it.description.trim(),
              quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
              category: it.category?.trim() || null,
              asset_id: it.asset_id || null,
              unit: it.unit?.trim() || 'UN',
              notes: it.notes?.trim() || null,
              status: it.status || 'PENDING'
            }))
        })
      ]);
    }

    const updated = await prisma.ticket.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        items: true,
        requester: true,
        assigned_to: true
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/tickets/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar chamado" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await req.json();
    const { content, is_internal, status } = body;
    
    // Atualiza status se mudou
    if (status) {
      const updateData: any = { status };
      if (status === 'RESOLVED') {
        updateData.resolved_at = new Date();
      } else if (status === 'CLOSED') {
        updateData.closed_at = new Date();
      }
      
      await prisma.ticket.update({
        where: { id: resolvedParams.id },
        data: updateData
      });
    }

    // Adiciona comentário se houver conteúdo
    if (content && content.trim().length > 0) {
      await prisma.ticketComment.create({
        data: {
          ticket_id: resolvedParams.id,
          author_id: session.user.id,
          content: content.trim(),
          is_internal: is_internal || false
        }
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Ticket update error:", error);
    return NextResponse.json({ error: "Erro ao atualizar chamado" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    await prisma.ticket.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Ticket delete error:", error);
    return NextResponse.json({ error: "Erro ao excluir chamado" }, { status: 500 });
  }
}
