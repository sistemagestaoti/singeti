import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUser } from "@/lib/currentUser";
import { encryptVaultSecret, logPcAccessAudit } from "@/lib/vault";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const domain = searchParams.get("domain")?.trim() || "";
    const provider = searchParams.get("provider")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const collaboratorId = searchParams.get("collaborator_id")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (provider && provider !== "ALL") {
      where.provider = provider;
    }

    if (collaboratorId && collaboratorId !== "ALL") {
      where.collaborator_id = collaboratorId;
    }

    if (domain && domain !== "ALL") {
      where.email_address = {
        endsWith: domain.startsWith("@") ? domain : `@${domain}`,
        mode: "insensitive" as const,
      };
    }

    if (search) {
      where.OR = [
        { email_address: { contains: search, mode: "insensitive" as const } },
        { account_name: { contains: search, mode: "insensitive" as const } },
        {
          collaborator: {
            name: { contains: search, mode: "insensitive" as const },
          },
        },
      ];
    }

    const [emails, total, allEmails] = await Promise.all([
      prisma.pcEmailAccount.findMany({
        where,
        include: {
          collaborator: {
            select: { id: true, name: true, email: true, job_title: true, department_name: true },
          },
          computer: {
            include: {
              asset: {
                select: { id: true, name: true, internal_id: true, asset_tag: true },
              },
            },
          },
          vault_secret: {
            select: { id: true, title: true, updated_at: true },
          },
        },
        orderBy: { email_address: "asc" },
        skip,
        take: limit,
      }),
      prisma.pcEmailAccount.count({ where }),
      prisma.pcEmailAccount.findMany({
        select: { email_address: true },
      }),
    ]);

    // Extrai lista única de domínios cadastrados (ex: @empresa.com.br, @dlamb.ind.br)
    const distinctDomains = Array.from(
      new Set(
        allEmails
          .map((e) => {
            const parts = e.email_address.split("@");
            return parts.length > 1 ? parts[1].toLowerCase() : null;
          })
          .filter(Boolean)
      )
    ).sort();

    const items = emails.map((item) => {
      const parts = item.email_address.split("@");
      const itemDomain = parts.length > 1 ? parts[1] : "";

      return {
        id: item.id,
        email_address: item.email_address,
        domain: itemDomain,
        account_name: item.account_name,
        provider: item.provider,
        account_type: item.account_type,
        status: item.status,
        auth_method: item.auth_method,
        mfa_enabled: item.mfa_enabled,
        has_secret: !!item.vault_secret_id,
        collaborator: item.collaborator,
        computer: item.computer
          ? {
              id: item.computer.id,
              hostname: item.computer.hostname,
              asset: item.computer.asset,
            }
          : null,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
      domains: distinctDomains,
    });
  } catch (error: any) {
    console.error("Erro ao listar contas de e-mail:", error);
    return NextResponse.json({ error: "Erro ao buscar e-mails" }, { status: 500 });
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
      password,
    } = body;

    if (!email_address || typeof email_address !== "string" || !email_address.includes("@")) {
      return NextResponse.json({ error: "Endereço de e-mail válido é obrigatório" }, { status: 400 });
    }

    let vaultSecretId: string | null = null;

    // Se senha informada, criptografa no cofre seguro com AES-256-GCM
    if (password && typeof password === "string" && password.trim().length > 0) {
      const encrypted = encryptVaultSecret(password.trim());
      const secret = await prisma.vaultSecret.create({
        data: {
          title: `Senha de E-mail: ${email_address.trim().toLowerCase()}`,
          encrypted_data: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          key_version: encrypted.keyVersion,
          secret_type: "EMAIL_PASSWORD",
          created_by: currentUser.id,
          updated_by: currentUser.id,
        },
      });
      vaultSecretId = secret.id;
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
        vault_secret_id: vaultSecretId,
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
      details: `Conta de e-mail registrada. Provedor: ${provider}, Usuário: ${emailAccount.collaborator?.name || 'Não vinculado'}, Proteção de Senha: ${vaultSecretId ? 'Cofre AES-256' : 'Sem custódia de senha'}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: emailAccount.id,
        email_address: emailAccount.email_address,
        account_name: emailAccount.account_name,
        provider: emailAccount.provider,
        has_secret: !!emailAccount.vault_secret_id,
        collaborator: emailAccount.collaborator,
      },
    }, { status: 201 });
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
      password,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID não informado" }, { status: 400 });
    }

    const existing = await prisma.pcEmailAccount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Conta de e-mail não encontrada" }, { status: 404 });
    }

    let vaultSecretId = existing.vault_secret_id;
    let passwordChanged = false;

    // Se nova senha fornecida, criptografa ou atualiza no cofre
    if (password && typeof password === "string" && password.trim().length > 0) {
      const encrypted = encryptVaultSecret(password.trim());

      if (vaultSecretId) {
        await prisma.vaultSecret.update({
          where: { id: vaultSecretId },
          data: {
            encrypted_data: encrypted.ciphertext,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            key_version: encrypted.keyVersion,
            updated_by: currentUser.id,
          },
        });
      } else {
        const secret = await prisma.vaultSecret.create({
          data: {
            title: `Senha de E-mail: ${email_address || existing.email_address}`,
            encrypted_data: encrypted.ciphertext,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            key_version: encrypted.keyVersion,
            secret_type: "EMAIL_PASSWORD",
            created_by: currentUser.id,
            updated_by: currentUser.id,
          },
        });
        vaultSecretId = secret.id;
      }
      passwordChanged = true;
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
        vault_secret_id: vaultSecretId,
      },
    });

    await logPcAccessAudit({
      action: "UPDATE_EMAIL",
      entityType: "EMAIL",
      entityId: updated.id,
      entityName: updated.email_address,
      user: currentUser,
      details: `Atualização de conta de e-mail. Status: ${updated.status}. Senha alterada: ${passwordChanged ? 'Sim' : 'Não'}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email_address: updated.email_address,
        account_name: updated.account_name,
        provider: updated.provider,
        has_secret: !!updated.vault_secret_id,
      },
    });
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

    if (email.vault_secret_id) {
      try {
        await prisma.vaultSecret.delete({ where: { id: email.vault_secret_id } });
      } catch {}
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
