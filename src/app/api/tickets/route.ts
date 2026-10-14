import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status) where.status = status;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true, avatar: true } },
        assigned_to: { select: { id: true, name: true, email: true, avatar: true } },
        category: true,
        asset: true,
        department: true,
        items: true,
        _count: {
          select: { items: true, comments: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json({ error: "Erro ao buscar chamados" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "O título do chamado é obrigatório" }, { status: 400 });
    }

    // Resolve current user ID
    let currentUserId = session.user.id;
    let user = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (user) currentUserId = user.id;
    }

    if (!user) {
      return NextResponse.json({ error: "Usuário inválido ou não cadastrado" }, { status: 400 });
    }

    // Gerar código único e sequencial (CH-XXXXXXX)
    const count = await prisma.ticket.count();
    const code = `CH-${String(count + 1).padStart(7, '0')}`;

    // Processar itens dinâmicos opcionais
    const itemsData = Array.isArray(body.items) 
      ? body.items
          .filter((it: any) => it && it.description && it.description.trim())
          .map((it: any) => ({
            description: it.description.trim(),
            quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
            category: it.category?.trim() || null,
            asset_id: it.asset_id || null,
            unit: it.unit?.trim() || 'UN',
            notes: it.notes?.trim() || null,
            status: it.status || 'PENDING'
          }))
      : [];

    const ticket = await prisma.ticket.create({
      data: {
        code,
        title: body.title.trim(),
        description: body.description?.trim() || "",
        type: body.type || "INCIDENT",
        urgency: body.urgency || "MEDIUM",
        impact: body.impact || "MEDIUM",
        priority: body.priority || "MEDIUM",
        requester_id: currentUserId,
        company_id: user.company_id,
        asset_id: body.asset_id || null,
        group_id: body.group_id || null,
        category_id: body.category_id || null,
        items: itemsData.length > 0 ? {
          create: itemsData
        } : undefined
      },
      include: {
        items: true,
        requester: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    console.error("Ticket creation error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao abrir chamado" }, { status: 500 });
  }
}
