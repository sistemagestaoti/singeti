import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUser } from "@/lib/currentUser";
import { logPcAccessAudit } from "@/lib/vault";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Busca o Asset por id ou por internal_id
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [{ id }, { internal_id: id }, { asset_tag: id }],
        type: "COMPUTER",
      },
      include: {
        location: true,
        department: true,
        user: true,
        computer: {
          include: {
            assignments: {
              include: {
                collaborator: true,
              },
              orderBy: [{ is_primary: "desc" }, { created_at: "desc" }],
            },
            accounts: {
              include: {
                collaborator: {
                  select: { id: true, name: true, email: true },
                },
                vault_secret: {
                  select: {
                    id: true,
                    title: true,
                    secret_type: true,
                    updated_at: true,
                  },
                },
              },
              orderBy: { created_at: "asc" },
            },
            email_accounts: {
              include: {
                collaborator: {
                  select: { id: true, name: true, email: true },
                },
              },
              orderBy: { created_at: "asc" },
            },
          },
        },
        Ticket: {
          select: {
            id: true,
            ticket_number: true,
            title: true,
            status: true,
            priority: true,
            type: true,
            created_at: true,
            assigned_to: { select: { id: true, name: true } },
            requester: { select: { id: true, name: true } },
          },
          orderBy: { created_at: "desc" },
          take: 20,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Computador não encontrado" }, { status: 404 });
    }

    // Busca histórico de auditoria específico deste computador
    const auditLogs = await prisma.pcAccessAuditLog.findMany({
      where: {
        OR: [
          { entity_id: asset.id },
          { entity_id: asset.computer?.id },
        ],
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    // Sanitiza contas para NUNCA expor senhas em texto simples
    const sanitizedAccounts = (asset.computer?.accounts || []).map((acc) => ({
      id: acc.id,
      username: acc.username,
      display_name: acc.display_name,
      account_type: acc.account_type,
      domain: acc.domain,
      status: acc.status,
      last_password_change: acc.last_password_change,
      notes: acc.notes,
      collaborator: acc.collaborator,
      has_secret: !!acc.vault_secret_id,
      vault_secret: acc.vault_secret,
      created_at: acc.created_at,
      updated_at: acc.updated_at,
    }));

    return NextResponse.json({
      asset: {
        id: asset.id,
        internal_id: asset.internal_id,
        asset_tag: asset.asset_tag,
        name: asset.name,
        status: asset.status,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serial_number: asset.serial_number,
        notes: asset.notes,
        location: asset.location,
        department: asset.department,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
      },
      computer: asset.computer
        ? {
            id: asset.computer.id,
            hostname: asset.computer.hostname,
            device_type: asset.computer.device_type,
            os_name: asset.computer.os_name,
            os_version: asset.computer.os_version,
            processor: asset.computer.processor,
            memory_mb: asset.computer.memory_mb,
            storage_gb: asset.computer.storage_gb,
            ip_address: asset.computer.ip_address,
            mac_address: asset.computer.mac_address,
            domain_workgroup: asset.computer.domain_workgroup,
            physical_location: asset.computer.physical_location,
            responsible_it_id: asset.computer.responsible_it_id,
            primary_user_id: asset.computer.primary_user_id,
          }
        : null,
      assignments: asset.computer?.assignments || [],
      accounts: sanitizedAccounts,
      email_accounts: asset.computer?.email_accounts || [],
      tickets: asset.Ticket || [],
      audit_logs: auditLogs,
    });
  } catch (error: any) {
    console.error("Erro ao obter detalhes do computador:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

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

    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      include: { computer: true },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Computador não encontrado" }, { status: 404 });
    }

    // Se o patrimônio foi alterado, valida duplicidade
    if (body.asset_tag && body.asset_tag !== existingAsset.asset_tag) {
      const duplicateTag = await prisma.asset.findFirst({
        where: {
          asset_tag: body.asset_tag.trim(),
          id: { not: existingAsset.id },
        },
      });
      if (duplicateTag) {
        return NextResponse.json(
          { error: `O patrimônio "${body.asset_tag}" já pertence a outro equipamento.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          name: body.name ? body.name.trim() : existingAsset.name,
          asset_tag: body.asset_tag !== undefined ? (body.asset_tag ? body.asset_tag.trim() : null) : existingAsset.asset_tag,
          status: body.status || existingAsset.status,
          manufacturer: body.manufacturer !== undefined ? body.manufacturer : existingAsset.manufacturer,
          model: body.model !== undefined ? body.model : existingAsset.model,
          serial_number: body.serial_number !== undefined ? body.serial_number : existingAsset.serial_number,
          department_id: body.department_id !== undefined ? (body.department_id || null) : existingAsset.department_id,
          location_id: body.location_id !== undefined ? (body.location_id || null) : existingAsset.location_id,
          notes: body.notes !== undefined ? body.notes : existingAsset.notes,
        },
      });

      let computer = null;
      if (existingAsset.computer) {
        computer = await tx.computer.update({
          where: { id: existingAsset.computer.id },
          data: {
            hostname: body.hostname !== undefined ? body.hostname : existingAsset.computer.hostname,
            device_type: body.device_type !== undefined ? body.device_type : existingAsset.computer.device_type,
            os_name: body.os_name !== undefined ? body.os_name : existingAsset.computer.os_name,
            os_version: body.os_version !== undefined ? body.os_version : existingAsset.computer.os_version,
            processor: body.processor !== undefined ? body.processor : existingAsset.computer.processor,
            memory_mb: body.memory_mb !== undefined ? (body.memory_mb ? Number(body.memory_mb) : null) : existingAsset.computer.memory_mb,
            storage_gb: body.storage_gb !== undefined ? (body.storage_gb ? Number(body.storage_gb) : null) : existingAsset.computer.storage_gb,
            ip_address: body.ip_address !== undefined ? body.ip_address : existingAsset.computer.ip_address,
            mac_address: body.mac_address !== undefined ? body.mac_address : existingAsset.computer.mac_address,
            domain_workgroup: body.domain_workgroup !== undefined ? body.domain_workgroup : existingAsset.computer.domain_workgroup,
            physical_location: body.physical_location !== undefined ? body.physical_location : existingAsset.computer.physical_location,
            responsible_it_id: body.responsible_it_id !== undefined ? body.responsible_it_id : existingAsset.computer.responsible_it_id,
          },
        });
      } else {
        computer = await tx.computer.create({
          data: {
            asset_id: existingAsset.id,
            hostname: body.hostname || existingAsset.name,
            device_type: body.device_type || "DESKTOP",
            os_name: body.os_name || null,
            os_version: body.os_version || null,
            processor: body.processor || null,
            memory_mb: body.memory_mb ? Number(body.memory_mb) : null,
            storage_gb: body.storage_gb ? Number(body.storage_gb) : null,
            ip_address: body.ip_address || null,
            mac_address: body.mac_address || null,
            domain_workgroup: body.domain_workgroup || "WORKGROUP",
            physical_location: body.physical_location || null,
          },
        });
      }

      return { asset, computer };
    });

    await logPcAccessAudit({
      action: "UPDATE_COMPUTER",
      entityType: "COMPUTER",
      entityId: existingAsset.id,
      entityName: `${updated.asset.name} (${updated.asset.internal_id})`,
      user: currentUser,
      details: `Atualização de dados cadastrais/técnicos. Status: ${updated.asset.status}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Erro ao atualizar computador:", error);
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
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      include: { computer: true },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Computador não encontrado" }, { status: 404 });
    }

    // Registra auditoria antes de desativar ou remover
    await logPcAccessAudit({
      action: "DELETE_COMPUTER",
      entityType: "COMPUTER",
      entityId: existingAsset.id,
      entityName: `${existingAsset.name} (${existingAsset.internal_id})`,
      user: currentUser,
      details: "Equipamento desativado/removido da gestão de acessos a PCs.",
    });

    // Em vez de hard delete que pode quebrar chamados históricos, atualiza status para DECOMMISSIONED
    await prisma.asset.update({
      where: { id },
      data: { status: "DECOMMISSIONED" },
    });

    return NextResponse.json({ success: true, message: "Computador desativado com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir/desativar computador:", error);
    return NextResponse.json({ error: "Erro ao desativar equipamento" }, { status: 500 });
  }
}
