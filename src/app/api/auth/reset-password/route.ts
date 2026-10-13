import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json({ error: "Token de redefinição não fornecido." }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
      return NextResponse.json({ error: "A nova senha deve possuir no mínimo 6 caracteres." }, { status: 400 });
    }

    const resetRequest = await prisma.passwordResetRequest.findUnique({
      where: { reset_token: token.trim() },
      include: { user: true }
    });

    if (!resetRequest) {
      return NextResponse.json({ error: "Link de redefinição inválido ou já utilizado." }, { status: 400 });
    }

    if (resetRequest.status === "RESOLVED") {
      return NextResponse.json({ error: "Este link já foi utilizado anteriormente." }, { status: 400 });
    }

    if (resetRequest.token_expires_at && resetRequest.token_expires_at < new Date()) {
      return NextResponse.json({ error: "Este link de redefinição expirou. Solicite uma nova recuperação." }, { status: 400 });
    }

    if (!resetRequest.user_id) {
      return NextResponse.json({ error: "Usuário associado a esta solicitação não foi localizado." }, { status: 400 });
    }

    // Gerar novo hash de senha seguro
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // Atualizar senha do usuário
    await prisma.user.update({
      where: { id: resetRequest.user_id },
      data: { password_hash: hashedPassword }
    });

    // Atualizar histórico de auditoria
    let currentHistory = [];
    try {
      currentHistory = JSON.parse(resetRequest.history || "[]");
    } catch (e) {
      currentHistory = [];
    }

    currentHistory.push({
      date: new Date().toISOString(),
      action: "PASSWORD_RESET_COMPLETED",
      actor: "USUARIO (Link Seguro)",
      notes: "Senha redefinida com sucesso pelo usuário através do token temporário.",
    });

    // Concluir chamado e invalidar token
    await prisma.passwordResetRequest.update({
      where: { id: resetRequest.id },
      data: {
        status: "RESOLVED",
        reset_token: null,
        token_expires_at: null,
        resolved_at: new Date(),
        history: JSON.stringify(currentHistory),
      }
    });

    return NextResponse.json({
      success: true,
      message: "Sua senha foi redefinida com sucesso! Você já pode realizar o login.",
    });
  } catch (error: any) {
    console.error("[ResetPassword] Erro ao redefinir senha:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a troca de senha. Tente novamente." },
      { status: 500 }
    );
  }
}
