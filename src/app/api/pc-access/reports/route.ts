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

    const currentUser = await resolveCurrentUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "Usuário atual não encontrado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "COMPUTERS"; // COMPUTERS, COLLABORATORS, ACCOUNTS, AUDIT

    let data: any = [];

    if (reportType === "COMPUTERS") {
      const assets = await prisma.asset.findMany({
        where: { type: "COMPUTER" },
        include: {
          computer: {
            include: {
              assignments: {
                where: { status: "ACTIVE" },
                include: { collaborator: true },
                orderBy: { is_primary: "desc" },
              },
            },
          },
          department: true,
          location: true,
        },
        orderBy: { asset_tag: "asc" },
      });

      data = assets.map((a) => {
        const primaryUser = a.computer?.assignments.find((x) => x.is_primary)?.collaborator;
        return {
          codigo: a.internal_id,
          patrimonio: a.asset_tag || "S/N",
          nome: a.name,
          hostname: a.computer?.hostname || "N/A",
          tipo: a.computer?.device_type || "DESKTOP",
          fabricante: a.manufacturer || "N/A",
          modelo: a.model || "N/A",
          serial: a.serial_number || "N/A",
          so: `${a.computer?.os_name || ''} ${a.computer?.os_version || ''}`.trim() || "N/A",
          ip: a.computer?.ip_address || "N/A",
          mac: a.computer?.mac_address || "N/A",
          usuario_principal: primaryUser?.name || "Sem responsável",
          setor: a.department?.name || "N/A",
          unidade: a.location?.name || "N/A",
          situacao: a.status,
          atualizado_em: a.updated_at.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        };
      });
    } else if (reportType === "COLLABORATORS") {
      const collabs = await prisma.pcCollaborator.findMany({
        include: {
          assignments: {
            where: { status: "ACTIVE" },
            include: { computer: { include: { asset: true } } },
          },
          accounts: { select: { username: true, account_type: true, status: true } },
          email_accounts: { select: { email_address: true, provider: true, status: true } },
        },
        orderBy: { name: "asc" },
      });

      data = collabs.map((c) => ({
        nome: c.name,
        matricula: c.employee_code || "N/A",
        cargo: c.job_title || "N/A",
        setor: c.department_name || "N/A",
        unidade: c.location_name || "N/A",
        email_corporativo: c.email || "N/A",
        telefone: c.phone || "N/A",
        status: c.status,
        computadores_vinculados: c.assignments
          .map((a) => `${a.computer.hostname || a.computer.asset.name} (${a.computer.asset.asset_tag || a.computer.asset.internal_id})`)
          .join("; ") || "Nenhum",
        contas_windows: c.accounts.map((acc) => acc.username).join(", ") || "Nenhuma",
        total_emails: c.email_accounts.length,
      }));
    } else if (reportType === "ACCOUNTS") {
      const accounts = await prisma.pcAccount.findMany({
        include: {
          computer: { include: { asset: true } },
          collaborator: true,
        },
        orderBy: { username: "asc" },
      });

      data = accounts.map((acc) => ({
        login_usuario: acc.username,
        nome_exibicao: acc.display_name || "N/A",
        tipo_conta: acc.account_type,
        dominio: acc.domain || "WORKGROUP",
        computador: `${acc.computer.asset.name} (${acc.computer.hostname || 'N/A'})`,
        patrimonio: acc.computer.asset.asset_tag || acc.computer.asset.internal_id,
        colaborador_titular: acc.collaborator?.name || "Não atribuído",
        status: acc.status,
        protegido_cofre: acc.vault_secret_id ? "SIM (AES-256)" : "NÃO",
        ultima_alteracao_senha: acc.last_password_change
          ? acc.last_password_change.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
          : "Não registrada",
      }));
    } else if (reportType === "AUDIT") {
      const logs = await prisma.pcAccessAuditLog.findMany({
        orderBy: { created_at: "desc" },
        take: 300,
      });

      data = logs.map((l) => ({
        data_hora: l.created_at.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        acao: l.action,
        entidade_tipo: l.entity_type,
        entidade: l.entity_name || l.entity_id || "N/A",
        usuario_executor: l.user_name || "N/A",
        email_executor: l.user_email || "N/A",
        status: l.status,
        detalhes: l.details || "N/A",
      }));
    }

    await logPcAccessAudit({
      action: "EXPORT_REPORT",
      entityType: "INVENTORY",
      user: currentUser,
      details: `Relatório exportado/consultado: ${reportType}. Total de linhas: ${data.length}`,
    });

    return NextResponse.json({ reportType, count: data.length, data });
  } catch (error: any) {
    console.error("Erro ao gerar relatório:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
