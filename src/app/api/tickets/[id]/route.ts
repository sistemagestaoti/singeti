import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

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
        updateData.closed_at = new Date(); // Warning: closed_at might not be in schema, let's keep what was there
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
          content: content,
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
