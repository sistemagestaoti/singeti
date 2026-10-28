import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUser } from "@/lib/currentUser";
import { logPcAccessAudit } from "@/lib/vault";

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
    const { computer_id, collaborator_id, is_primary = false, notes } = body;

    if (!computer_id || !collaborator_id) {
      return NextResponse.json({ error: "Computador e Colaborador são obrigatórios" }, { status: 400 });
    }

    // Verifica se já existe vínculo ativo
    const existingActive = await prisma.pcUserAssignment.findFirst({
      where: { computer_id, collaborator_id, status: "ACTIVE" },
    });

    if (existingActive) {
      return NextResponse.json({ error: "Este colaborador já está vinculado a este computador." }, { status: 400 });
    }

    const computer = await prisma.computer.findUnique({
      where: { id: computer_id },
      include: { asset: true },
    });

    const collaborator = await prisma.pcCollaborator.findUnique({
      where: { id: collaborator_id },
    });

    if (!computer || !collaborator) {
      return NextResponse.json({ error: "Computador ou Colaborador não encontrado" }, { status: 404 });
    }

    const assignment = await prisma.$transaction(async (tx) => {
      // Se for definido como principal, desmarca o anterior
      if (is_primary) {
        await tx.pcUserAssignment.updateMany({
          where: { computer_id, is_primary: true },
          data: { is_primary: false },
        });

        // Atualiza primary_user_id no computer
        await tx.computer.update({
          where: { id: computer_id },
          data: { primary_user_id: collaborator.id },
        });
      }

      return await tx.pcUserAssignment.create({
        data: {
          computer_id,
          collaborator_id,
          is_primary,
          status: "ACTIVE",
          assigned_by: currentUser.name,
          notes: notes?.trim() || null,
        },
        include: {
          collaborator: true,
        },
      });
    });

    await logPcAccessAudit({
      action: is_primary ? "ASSIGN_PRIMARY_USER" : "ASSIGN_USER",
      entityType: "COMPUTER",
      entityId: computer.asset.id,
      entityName: `${computer.asset.name} (${computer.hostname})`,
      user: currentUser,
      details: `Vínculo com colaborador: ${collaborator.name} ${is_primary ? '(Usuário Principal)' : ''}`,
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao vincular colaborador ao computador:", error);
    return NextResponse.json({ error: error.message || "Erro ao vincular colaborador" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const currentUser = await resolveCurrentUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "Usuário atual não encontrado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("id");

    if (!assignmentId) {
      return NextResponse.json({ error: "ID do vínculo não informado" }, { status: 400 });
    }

    const assignment = await prisma.pcUserAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        collaborator: true,
        computer: { include: { asset: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 });
    }

    await prisma.pcUserAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "INACTIVE",
        end_date: new Date(),
        is_primary: false,
      },
    });

    await logPcAccessAudit({
      action: "UNASSIGN_USER",
      entityType: "COMPUTER",
      entityId: assignment.computer.asset.id,
      entityName: `${assignment.computer.asset.name} (${assignment.computer.hostname})`,
      user: currentUser,
      details: `Desvinculação do colaborador: ${assignment.collaborator.name}`,
    });

    return NextResponse.json({ success: true, message: "Vínculo encerrado com sucesso" });
  } catch (error: any) {
    console.error("Erro ao remover vínculo:", error);
    return NextResponse.json({ error: "Erro ao desvincular" }, { status: 500 });
  }
}
