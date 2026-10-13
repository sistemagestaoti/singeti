import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendPasswordResetUserToken } from "@/lib/mailer";

// Verificação estrita de perfil administrativo no backend
function isAdmin(session: any): boolean {
  if (!session || !session.user) return false;
  const role = (session.user.role || "").toUpperCase();
  return role === "ADMINISTRADOR" || role === "ADMIN" || role === "GESTOR";
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores podem gerenciar solicitações." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const where: any = {};
    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { protocol: { contains: search } },
        { user_name: { contains: search } },
        { username: { contains: search } },
        { user_email: { contains: search } },
      ];
    }

    const requests = await prisma.passwordResetRequest.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } },
            department: { select: { name: true } }
          }
        }
      }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("[AdminPasswordResets] Erro ao listar solicitações:", error);
    return NextResponse.json({ error: "Erro ao consultar solicitações." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Acesso negado. Operação restrita a administradores." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, action, notes, newPassword } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "ID e Ação são obrigatórios." }, { status: 400 });
    }

    const resetReq = await prisma.passwordResetRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!resetReq) {
      return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    }

    let currentHistory = [];
    try {
      currentHistory = JSON.parse(resetReq.history || "[]");
    } catch (e) {
      currentHistory = [];
    }

    const adminName = session?.user?.name || "Administrador";
    const adminId = session?.user?.id || "admin";

    // Ação 1: Assumir atendimento da solicitação
    if (action === "ASSIGN") {
      currentHistory.push({
        date: new Date().toISOString(),
        action: "ASSIGNED",
        actor: adminName,
        notes: notes || "Atendimento iniciado pelo administrador.",
      });

      const updated = await prisma.passwordResetRequest.update({
        where: { id },
        data: {
          admin_id: adminId,
          admin_name: adminName,
          status: "IN_PROGRESS",
          history: JSON.stringify(currentHistory),
        }
      });

      return NextResponse.json({ success: true, request: updated });
    }

    // Ação 2: Gerar Token Seguro e Link de Redefinição para o Usuário
    if (action === "GENERATE_LINK") {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresInMinutes = 60;
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      const host = req.headers.get("host") || "singeti.vercel.app";
      const proto = host.includes("localhost") ? "http" : "https";
      const resetUrl = `${proto}://${host}/reset-password?token=${token}`;

      currentHistory.push({
        date: new Date().toISOString(),
        action: "TOKEN_GENERATED",
        actor: adminName,
        notes: `Link seguro de uso único gerado (expiração em ${expiresInMinutes} min). ${notes || ''}`,
      });

      const updated = await prisma.passwordResetRequest.update({
        where: { id },
        data: {
          reset_token: token,
          token_expires_at: expiresAt,
          admin_id: adminId,
          admin_name: adminName,
          status: "IN_PROGRESS",
          history: JSON.stringify(currentHistory),
        }
      });

      // Se o usuário possuir e-mail válido, dispara o link para ele
      if (resetReq.user_email) {
        sendPasswordResetUserToken({
          userEmail: resetReq.user_email,
          userName: resetReq.user_name,
          resetUrl,
          protocol: resetReq.protocol,
          expiresInMinutes,
        }).catch(err => {
          console.error("[AdminPasswordResets] Erro ao enviar token para o usuário:", err);
        });
      }

      return NextResponse.json({
        success: true,
        resetUrl,
        expiresAt,
        request: updated,
        message: "Link seguro de uso único gerado com sucesso."
      });
    }

    // Ação 3: Redefinição Direta Segura pelo Administrador
    if (action === "DIRECT_RESET") {
      if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
        return NextResponse.json({ error: "A nova senha temporária deve possuir no mínimo 6 caracteres." }, { status: 400 });
      }

      if (!resetReq.user_id) {
        return NextResponse.json({ error: "Usuário não vinculado à solicitação." }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

      await prisma.user.update({
        where: { id: resetReq.user_id },
        data: { password_hash: hashedPassword }
      });

      currentHistory.push({
        date: new Date().toISOString(),
        action: "ADMIN_DIRECT_RESET",
        actor: adminName,
        notes: `Senha redefinida diretamente pelo administrador. ${notes || ''}`,
      });

      const updated = await prisma.passwordResetRequest.update({
        where: { id },
        data: {
          status: "RESOLVED",
          reset_token: null,
          token_expires_at: null,
          resolved_at: new Date(),
          admin_id: adminId,
          admin_name: adminName,
          admin_notes: notes || "Senha redefinida pelo administrador.",
          history: JSON.stringify(currentHistory),
        }
      });

      return NextResponse.json({
        success: true,
        request: updated,
        message: "Senha atualizada com sucesso no banco de dados."
      });
    }

    // Ação 4: Cancelar Solicitação
    if (action === "CANCEL") {
      currentHistory.push({
        date: new Date().toISOString(),
        action: "REQUEST_CANCELLED",
        actor: adminName,
        notes: notes || "Solicitação cancelada pelo administrador.",
      });

      const updated = await prisma.passwordResetRequest.update({
        where: { id },
        data: {
          status: "CANCELLED",
          reset_token: null,
          token_expires_at: null,
          admin_id: adminId,
          admin_name: adminName,
          admin_notes: notes || "Cancelada.",
          history: JSON.stringify(currentHistory),
        }
      });

      return NextResponse.json({ success: true, request: updated });
    }

    // Ação 5: Concluir Solicitação
    if (action === "RESOLVE") {
      currentHistory.push({
        date: new Date().toISOString(),
        action: "REQUEST_RESOLVED",
        actor: adminName,
        notes: notes || "Solicitação concluída manualmente.",
      });

      const updated = await prisma.passwordResetRequest.update({
        where: { id },
        data: {
          status: "RESOLVED",
          reset_token: null,
          token_expires_at: null,
          resolved_at: new Date(),
          admin_id: adminId,
          admin_name: adminName,
          admin_notes: notes || "Concluída.",
          history: JSON.stringify(currentHistory),
        }
      });

      return NextResponse.json({ success: true, request: updated });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error: any) {
    console.error("[AdminPasswordResets] Erro na operação:", error);
    return NextResponse.json({ error: "Erro ao processar ação administrativa." }, { status: 500 });
  }
}
