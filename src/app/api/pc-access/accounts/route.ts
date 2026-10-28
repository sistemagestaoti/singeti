import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCurrentUser } from "@/lib/currentUser";
import { encryptVaultSecret, logPcAccessAudit } from "@/lib/vault";

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
      computer_id,
      collaborator_id,
      username,
      display_name,
      account_type = "LOCAL_STANDARD",
      domain = "WORKGROUP",
      status = "ACTIVE",
      notes,
      password,
    } = body;

    if (!computer_id || !username) {
      return NextResponse.json({ error: "Computador e Nome de Usuário são obrigatórios" }, { status: 400 });
    }

    const computer = await prisma.computer.findUnique({
      where: { id: computer_id },
      include: { asset: true },
    });

    if (!computer) {
      return NextResponse.json({ error: "Computador não encontrado" }, { status: 404 });
    }

    let vaultSecretId: string | null = null;

    // Se uma credencial foi informada, criptografa com AES-256-GCM no cofre
    if (password && typeof password === "string" && password.trim().length > 0) {
      const encrypted = encryptVaultSecret(password.trim());
      const secret = await prisma.vaultSecret.create({
        data: {
          title: `Credencial ${username.trim()} @ ${computer.hostname || computer.asset.name}`,
          encrypted_data: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          key_version: encrypted.keyVersion,
          secret_type: account_type.includes("ADMIN") ? "LOCAL_ADMIN" : "PASSWORD",
          created_by: currentUser.id,
          updated_by: currentUser.id,
        },
      });
      vaultSecretId = secret.id;
    }

    const account = await prisma.pcAccount.create({
      data: {
        computer_id,
        collaborator_id: collaborator_id || null,
        username: username.trim(),
        display_name: display_name?.trim() || null,
        account_type,
        domain: domain?.trim() || "WORKGROUP",
        status,
        notes: notes?.trim() || null,
        vault_secret_id: vaultSecretId,
        last_password_change: vaultSecretId ? new Date() : null,
      },
      include: {
        collaborator: { select: { id: true, name: true, email: true } },
      },
    });

    await logPcAccessAudit({
      action: "CREATE_ACCOUNT",
      entityType: "ACCOUNT",
      entityId: account.id,
      entityName: `${account.username} (${account.account_type})`,
      user: currentUser,
      details: `Conta registrada no computador ${computer.asset.name}. Proteção de segredo: ${vaultSecretId ? 'Cofre AES-256-GCM Habilitado' : 'Sem credencial custodiada'}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: account.id,
        username: account.username,
        display_name: account.display_name,
        account_type: account.account_type,
        domain: account.domain,
        status: account.status,
        has_secret: !!account.vault_secret_id,
        last_password_change: account.last_password_change,
        collaborator: account.collaborator,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao registrar conta de PC:", error);
    return NextResponse.json({ error: error.message || "Erro ao criar conta" }, { status: 500 });
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
    const { id, collaborator_id, username, display_name, account_type, domain, status, notes, password } = body;

    if (!id) {
      return NextResponse.json({ error: "ID da conta não informado" }, { status: 400 });
    }

    const existingAccount = await prisma.pcAccount.findUnique({
      where: { id },
      include: { computer: { include: { asset: true } } },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    let vaultSecretId = existingAccount.vault_secret_id;
    let passwordChanged = false;

    // Se uma nova senha foi enviada, criptografa no cofre
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
            title: `Credencial ${username || existingAccount.username} @ ${existingAccount.computer.hostname}`,
            encrypted_data: encrypted.ciphertext,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            key_version: encrypted.keyVersion,
            secret_type: (account_type || existingAccount.account_type).includes("ADMIN") ? "LOCAL_ADMIN" : "PASSWORD",
            created_by: currentUser.id,
            updated_by: currentUser.id,
          },
        });
        vaultSecretId = secret.id;
      }
      passwordChanged = true;
    }

    const updated = await prisma.pcAccount.update({
      where: { id },
      data: {
        collaborator_id: collaborator_id !== undefined ? (collaborator_id || null) : existingAccount.collaborator_id,
        username: username ? username.trim() : existingAccount.username,
        display_name: display_name !== undefined ? display_name : existingAccount.display_name,
        account_type: account_type || existingAccount.account_type,
        domain: domain !== undefined ? domain : existingAccount.domain,
        status: status || existingAccount.status,
        notes: notes !== undefined ? notes : existingAccount.notes,
        vault_secret_id: vaultSecretId,
        last_password_change: passwordChanged ? new Date() : existingAccount.last_password_change,
      },
    });

    await logPcAccessAudit({
      action: "UPDATE_ACCOUNT",
      entityType: "ACCOUNT",
      entityId: updated.id,
      entityName: `${updated.username} (${updated.account_type})`,
      user: currentUser,
      details: `Conta atualizada no PC ${existingAccount.computer.asset.name}. Rotação de senha realizada: ${passwordChanged ? 'Sim' : 'Não'}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        username: updated.username,
        display_name: updated.display_name,
        account_type: updated.account_type,
        domain: updated.domain,
        status: updated.status,
        has_secret: !!updated.vault_secret_id,
        last_password_change: updated.last_password_change,
      },
    });
  } catch (error: any) {
    console.error("Erro ao atualizar conta de PC:", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar conta" }, { status: 500 });
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
    const accountId = searchParams.get("id");

    if (!accountId) {
      return NextResponse.json({ error: "ID da conta não informado" }, { status: 400 });
    }

    const account = await prisma.pcAccount.findUnique({
      where: { id: accountId },
      include: { computer: { include: { asset: true } } },
    });

    if (!account) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    // Se tinha segredo no cofre, exclui o segredo com segurança
    if (account.vault_secret_id) {
      try {
        await prisma.vaultSecret.delete({ where: { id: account.vault_secret_id } });
      } catch {}
    }

    await prisma.pcAccount.delete({ where: { id: accountId } });

    await logPcAccessAudit({
      action: "DELETE_ACCOUNT",
      entityType: "ACCOUNT",
      entityId: account.id,
      entityName: `${account.username} (${account.account_type})`,
      user: currentUser,
      details: `Conta removida do computador ${account.computer.asset.name}.`,
    });

    return NextResponse.json({ success: true, message: "Conta removida com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir conta:", error);
    return NextResponse.json({ error: "Erro ao excluir conta" }, { status: 500 });
  }
}
