import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/lib/currentUser";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const priority = searchParams.get("priority")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const assigned_to_id = searchParams.get("assigned_to_id")?.trim() || "";
    const category_id = searchParams.get("category_id")?.trim() || "";

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (category_id && category_id !== "ALL") {
      where.category_id = category_id;
    }

    if (assigned_to_id) {
      if (assigned_to_id === "UNASSIGNED") {
        where.assigned_to_id = null;
      } else if (assigned_to_id !== "ALL") {
        where.assigned_to_id = assigned_to_id;
      }
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { title: { contains: search } },
        { description: { contains: search } },
        { requester: { name: { contains: search } } },
        { assigned_to: { name: { contains: search } } },
      ];
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          requester: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          assigned_to: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          category: true,
          asset: {
            select: { id: true, name: true, internal_id: true, asset_tag: true, type: true }
          },
          department: true,
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit
      }),
      prisma.ticket.count({ where })
    ]);

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json({ error: "Erro ao listar chamados" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    
    // Gerar número único (CH-XXXXXXX)
    const count = await prisma.ticket.count();
    const code = `CH-${String(count + 1).padStart(7, '0')}`;

    // Buscar o usuário real e sua empresa para multi-tenancy
    const user = await resolveCurrentUser(session);
    if (!user) {
      return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });
    }

    // Se informou um solicitante específico (abertura em nome de outro colaborador)
    const targetRequesterId = body.requester_id && body.requester_id.trim() !== "" 
      ? body.requester_id.trim() 
      : user.id;

    // Se vierem itens solicitados estruturados, formata na descrição
    let finalDescription = body.description || "";
    if (body.requested_items && Array.isArray(body.requested_items) && body.requested_items.length > 0) {
      const itemsList = body.requested_items.map((item: any, idx: number) => {
        const qty = item.quantity ? ` (Qtd: ${item.quantity})` : '';
        const cat = item.category ? ` [${item.category}]` : '';
        const details = item.details ? ` - ${item.details}` : '';
        return `${idx + 1}. ${item.name}${qty}${cat}${details}`;
      }).join('\n');

      finalDescription = `${finalDescription}\n\n--- ITENS / RECURSOS SOLICITADOS ---\n${itemsList}`;
    }

    const ticket = await prisma.ticket.create({
      data: {
        code,
        title: body.title,
        description: finalDescription,
        type: body.type || "INCIDENT",
        urgency: body.urgency || "MEDIUM",
        impact: body.impact || "MEDIUM",
        priority: body.priority || "MEDIUM",
        status: body.status || "NEW",
        requester_id: targetRequesterId,
        assigned_to_id: body.assigned_to_id || null,
        company_id: user.company_id,
        asset_id: body.asset_id || null,
        group_id: body.group_id || null,
        category_id: body.category_id || null,
      },
      include: {
        requester: true,
        assigned_to: true,
        category: true,
        asset: true,
        department: true
      }
    });

    // Registra o primeiro evento na timeline
    try {
      await prisma.ticketComment.create({
        data: {
          ticket_id: ticket.id,
          author_id: user.id,
          content: `Chamado aberto com status "${ticket.status}" e prioridade "${ticket.priority}".`,
          is_internal: true,
        }
      });
    } catch (e) {
      console.warn("Falha ao registrar log inicial do chamado:", e);
    }

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    console.error("Ticket creation error:", error);
    return NextResponse.json({ error: "Erro ao abrir chamado" }, { status: 500 });
  }
}
