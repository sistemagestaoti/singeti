import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUser } from "@/lib/currentUser";
import { logPcAccessAudit } from "@/lib/vault";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const department = searchParams.get("department")?.trim() || "";

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (department && department !== "ALL") {
      where.department_name = department;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employee_code: { contains: search, mode: "insensitive" } },
        { job_title: { contains: search, mode: "insensitive" } },
        { department_name: { contains: search, mode: "insensitive" } },
      ];
    }

    const collaborators = await prisma.pcCollaborator.findMany({
      where,
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          include: {
            computer: {
              include: {
                asset: {
                  select: { id: true, internal_id: true, asset_tag: true, name: true, status: true },
                },
              },
            },
          },
        },
        accounts: {
          select: { id: true, username: true, status: true },
        },
        email_accounts: {
          select: { id: true, email_address: true, status: true },
        },
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    const items = collaborators.map((c) => ({
      id: c.id,
      name: c.name,
      employee_code: c.employee_code,
      job_title: c.job_title,
      department_name: c.department_name,
      location_name: c.location_name,
      email: c.email,
      phone: c.phone,
      status: c.status,
      notes: c.notes,
      active_computers_count: c.assignments.length,
      computers: c.assignments.map((a) => ({
        assignment_id: a.id,
        is_primary: a.is_primary,
        computer_id: a.computer_id,
        asset_id: a.computer.asset.id,
        internal_id: a.computer.asset.internal_id,
        asset_tag: a.computer.asset.asset_tag,
        name: a.computer.asset.name,
        hostname: a.computer.hostname,
      })),
      accounts_count: c.accounts.length,
      emails_count: c.email_accounts.length,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    return NextResponse.json({ items }, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    console.error("Erro ao listar colaboradores:", error);
    return NextResponse.json({ error: "Erro ao buscar colaboradores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const currentUser = await resolveCurrentUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "Usuário atual não encontrado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      employee_code,
      job_title,
      department_name,
      location_name,
      email,
      phone,
      status = "ACTIVE",
      notes,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nome completo do colaborador é obrigatório" }, { status: 400 });
    }

    const newCollaborator = await prisma.pcCollaborator.create({
      data: {
        name: name.trim(),
        employee_code: employee_code?.trim() || null,
        job_title: job_title?.trim() || null,
        department_name: department_name?.trim() || null,
        location_name: location_name?.trim() || null,
        email: email?.trim().toLowerCase() || null,
        phone: phone?.trim() || null,
        status,
        notes: notes?.trim() || null,
        company_id: currentUser.company_id,
      },
    });

    await logPcAccessAudit({
      action: "CREATE_COLLABORATOR",
      entityType: "COLLABORATOR",
      entityId: newCollaborator.id,
      entityName: newCollaborator.name,
      user: currentUser,
      details: `Novo colaborador cadastrado. Cargo: ${newCollaborator.job_title || 'N/A'}, Setor: ${newCollaborator.department_name || 'N/A'}`,
    });

    return NextResponse.json({ success: true, data: newCollaborator }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar colaborador:", error);
    return NextResponse.json({ error: error.message || "Erro ao salvar colaborador" }, { status: 500 });
  }
}
