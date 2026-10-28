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
    const {
      email_address,
      account_name,
      provider = "M365",
      account_type = "INDIVIDUAL",
      collaborator_id,
      computer_id,
      status = "ACTIVE",
      auth_method = "SSO_SAML",
      mfa_enabled = "UNKNOWN",
      notes,
    } = body;

    if (!email_address || typeof email_address !== "string") {
      return NextResponse.json({ error: "Endereço de e-mail é obrigatório" }, { status: 400 });
    }

    const emailAccount = await prisma.pcEmailAccount.create({
      data: {
        email_address: email_address.trim().toLowerCase(),
        account_name: account_name?.trim() || null,
        provider,
        account_type,
        collaborator_id: collaborator_id || null,
        computer_id: computer_id || null,
        status,
        auth_method,
        mfa_enabled,
        notes: notes?.trim() || null,
      },
      include: {
        collaborator: { select: { id: true, name: true, email: true } },
      },
    });

    await logPcAccessAudit({
      action: "CREATE_EMAIL",
      entityType: "EMAIL",
      entityId: emailAccount.id,
      entityName: emailAccount.email_address,
      user: currentUser,
      details: `Conta de e-mail registrada. Provedor: ${provider}, Tipo: ${account_type}, MFA: ${mfa_enabled}`,
    });

    return NextResponse.json({ success: true, data: emailAccount }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao registrar e-mail:", error);
    return NextResponse.json({ error: error.message || "Erro ao registrar e-mail" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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
      id,
      email_address,
      account_name,
      provider,
      account_type,
      collaborator_id,
      computer_id,
      status,
      auth_method,
      mfa_enabled,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID não informado" }, { status: 400 });
    }

    const existing = await prisma.pcEmailAccount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Conta de e-mail não encontrada" }, { status: 404 });
    }

    const updated = await prisma.pcEmailAccount.update({
      where: { id },
      data: {
        email_address: email_address ? email_address.trim().toLowerCase() : existing.email_address,
        account_name: account_name !== undefined ? account_name : existing.account_name,
        provider: provider || existing.provider,
        account_type: account_type || existing.account_type,
        collaborator_id: collaborator_id !== undefined ? (collaborator_id || null) : existing.collaborator_id,
        computer_id: computer_id !== undefined ? (computer_id || null) : existing.computer_id,
        status: status || existing.status,
        auth_method: auth_method || existing.auth_method,
        mfa_enabled: mfa_enabled || existing.mfa_enabled,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    await logPcAccessAudit({
      action: "UPDATE_EMAIL",
      entityType: "EMAIL",
      entityId: updated.id,
      entityName: updated.email_address,
      user: currentUser,
      details: `Atualização de conta de e-mail. Status: ${updated.status}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Erro ao atualizar e-mail:", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar e-mail" }, { status: 500 });
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
    const emailId = searchParams.get("id");

    if (!emailId) {
      return NextResponse.json({ error: "ID não informado" }, { status: 400 });
    }

    const email = await prisma.pcEmailAccount.findUnique({ where: { id: emailId } });
    if (!email) {
      return NextResponse.json({ error: "E-mail não encontrado" }, { status: 404 });
    }

    await prisma.pcEmailAccount.delete({ where: { id: emailId } });

    await logPcAccessAudit({
      action: "DELETE_EMAIL",
      entityType: "EMAIL",
      entityId: email.id,
      entityName: email.email_address,
      user: currentUser,
      details: `Conta de e-mail removida do sistema.`,
    });

    return NextResponse.json({ success: true, message: "Conta de e-mail removida com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir e-mail:", error);
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
