import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/lib/currentUser";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: resolvedParams.id },
      include: {
        requester: true,
        assigned_to: true,
        category: true,
        asset: {
          include: {
            computer: true,
          }
        },
        department: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: {
            created_at: "asc"
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error("GET /api/tickets/[id] error:", error);
    return NextResponse.json({ error: "Erro ao carregar chamado" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const user = await resolveCurrentUser(session);
    const body = await req.json();

    const existingTicket = await prisma.ticket.findUnique({
      where: { id: resolvedParams.id },
      include: { assigned_to: true }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    const updateData: any = {};
    const auditLogs: string[] = [];

    if (body.status !== undefined && body.status !== existingTicket.status) {
      updateData.status = body.status;
      if (body.status === "RESOLVED") {
        updateData.resolved_at = new Date();
      } else if (body.status === "CLOSED") {
        updateData.closed_at = new Date();
      } else {
        updateData.resolved_at = null;
        updateData.closed_at = null;
      }
      auditLogs.push(`Status alterado de "${existingTicket.status}" para "${body.status}".`);
    }

    if (body.assigned_to_id !== undefined && body.assigned_to_id !== existingTicket.assigned_to_id) {
      updateData.assigned_to_id = body.assigned_to_id || null;
      if (body.assigned_to_id) {
        const newTech = await prisma.user.findUnique({ where: { id: body.assigned_to_id } });
        auditLogs.push(`Atribuído para o técnico "${newTech?.name || 'Novo Responsável'}".`);
      } else {
        auditLogs.push(`Atribuição de técnico removida.`);
      }
    }

    if (body.priority !== undefined && body.priority !== existingTicket.priority) {
      updateData.priority = body.priority;
      auditLogs.push(`Prioridade alterada de "${existingTicket.priority}" para "${body.priority}".`);
    }

    if (body.urgency !== undefined && body.urgency !== existingTicket.urgency) {
      updateData.urgency = body.urgency;
    }

    if (body.impact !== undefined && body.impact !== existingTicket.impact) {
      updateData.impact = body.impact;
    }

    if (body.category_id !== undefined && body.category_id !== existingTicket.category_id) {
      updateData.category_id = body.category_id || null;
      auditLogs.push(`Categoria do chamado atualizada.`);
    }

    if (body.asset_id !== undefined && body.asset_id !== existingTicket.asset_id) {
      updateData.asset_id = body.asset_id || null;
      auditLogs.push(`Ativo vinculado atualizado.`);
    }

    if (body.group_id !== undefined && body.group_id !== existingTicket.group_id) {
      updateData.group_id = body.group_id || null;
      auditLogs.push(`Grupo/Departamento responsável alterado.`);
    }

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;

    const updated = await prisma.ticket.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        requester: { select: { id: true, name: true, email: true, avatar: true } },
        assigned_to: { select: { id: true, name: true, email: true, avatar: true } },
        category: true,
        asset: true,
        department: true,
      }
    });

    // Registra notas de auditoria na timeline se houver alterações importantes
    if (auditLogs.length > 0 && user) {
      await prisma.ticketComment.create({
        data: {
          ticket_id: resolvedParams.id,
          author_id: user.id,
          content: auditLogs.join(" "),
          is_internal: true
        }
      });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/tickets/[id] error:", error);
    return NextResponse.json({ error: "Erro ao atualizar chamado" }, { status: 500 });
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
    const user = await resolveCurrentUser(session);
    const authorId = user ? user.id : session.user.id;
    
    // Atualiza status se foi solicitado juntamente com o comentário
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
      const comment = await prisma.ticketComment.create({
        data: {
          ticket_id: resolvedParams.id,
          author_id: authorId,
          content: content.trim(),
          is_internal: is_internal || false
        },
        include: {
          author: true
        }
      });

      return NextResponse.json(comment, { status: 201 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Ticket update/comment error:", error);
    return NextResponse.json({ error: "Erro ao registrar interação" }, { status: 500 });
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
