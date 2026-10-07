import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    
    // Gerar número único (CH-XXXX)
    const count = await prisma.ticket.count();
    const code = `CH-${String(count + 1).padStart(7, '0')}`;

    // Buscar o ID da empresa associada ao usuário para multi-tenancy
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        code,
        title: body.title,
        description: body.description,
        type: body.type,
        priority: body.priority,
        requester_id: session.user.id,
        company_id: user.company_id,
        asset_id: body.asset_id || null,
        group_id: body.group_id || null,
        category_id: body.category_id || null,
      }
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    console.error("Ticket creation error:", error);
    return NextResponse.json({ error: "Erro ao abrir chamado" }, { status: 500 });
  }
}
