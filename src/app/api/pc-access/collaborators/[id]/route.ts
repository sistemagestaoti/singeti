import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUser } from "@/lib/currentUser";
import { logPcAccessAudit } from "@/lib/vault";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const currentUser = await resolveCurrentUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "Usuário atual não encontrado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.pcCollaborator.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }

    const updated = await prisma.pcCollaborator.update({
      where: { id },
      data: {
        name: body.name ? body.name.trim() : existing.name,
        employee_code: body.employee_code !== undefined ? body.employee_code : existing.employee_code,
        job_title: body.job_title !== undefined ? body.job_title : existing.job_title,
        department_name: body.department_name !== undefined ? body.department_name : existing.department_name,
        location_name: body.location_name !== undefined ? body.location_name : existing.location_name,
        email: body.email !== undefined ? (body.email ? body.email.trim().toLowerCase() : null) : existing.email,
        phone: body.phone !== undefined ? body.phone : existing.phone,
        status: body.status || existing.status,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    });

    await logPcAccessAudit({
      action: "UPDATE_COLLABORATOR",
      entityType: "COLLABORATOR",
      entityId: existing.id,
      entityName: updated.name,
      user: currentUser,
      details: `Atualização de dados cadastrais. Status: ${updated.status}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Erro ao atualizar colaborador:", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const currentUser = await resolveCurrentUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "Usuário atual não encontrado" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.pcCollaborator.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }

    // Inativa o colaborador e desativa seus vínculos ativos
    await prisma.$transaction([
      prisma.pcCollaborator.update({
        where: { id },
        data: { status: "INACTIVE" },
      }),
      prisma.pcUserAssignment.updateMany({
        where: { collaborator_id: id, status: "ACTIVE" },
        data: { status: "INACTIVE", end_date: new Date() },
      }),
    ]);

    await logPcAccessAudit({
      action: "INACTIVATE_COLLABORATOR",
      entityType: "COLLABORATOR",
      entityId: existing.id,
      entityName: existing.name,
      user: currentUser,
      details: "Colaborador inativado e desvinculado dos computadores.",
    });

    return NextResponse.json({ success: true, message: "Colaborador inativado com sucesso" });
  } catch (error: any) {
    console.error("Erro ao inativar colaborador:", error);
    return NextResponse.json({ error: "Erro ao inativar" }, { status: 500 });
  }
}
