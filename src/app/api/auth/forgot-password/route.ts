import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendPasswordResetAdminNotification } from "@/lib/mailer";

// Rate limiting simples em memória (máx 5 tentativas a cada 15 min por IP)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || record.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (record.count >= 5) {
    return false;
  }
  record.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Desconhecido";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { identifier } = body;

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { error: "Informe seu e-mail ou nome de usuário cadastrado." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();
    const cleanLower = cleanIdentifier.toLowerCase();

    // Localizar usuário com tolerância (usuário, e-mail ou nome)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanLower },
          { username: cleanIdentifier },
          { email: cleanLower },
          { name: cleanIdentifier },
          { name: { contains: cleanIdentifier } },
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        status: true,
      }
    });

    const neutralMessage = "Se os dados informados corresponderem a uma conta válida, sua solicitação será encaminhada para análise. Acompanhe as orientações recebidas pelo canal cadastrado.";

    // Se o usuário existir e estiver ativo
    if (user) {
      // Gerar protocolo legível único
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const protocol = `REC-${datePart}-${randomPart}`;

      // Montar URL do painel administrativo
      const host = req.headers.get("host") || "singeti.vercel.app";
      const proto = host.includes("localhost") ? "http" : "https";
      const adminUrl = `${proto}://${host}/settings/password-resets`;

      const requestDate = new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Gravar chamado interno de recuperação
      const historyEntry = {
        date: new Date().toISOString(),
        action: "REQUEST_CREATED",
        actor: "USUARIO (Login)",
        notes: `Solicitação registrada a partir do IP ${ip}`,
      };

      await prisma.passwordResetRequest.create({
        data: {
          protocol,
          user_id: user.id,
          user_name: user.name,
          username: cleanIdentifier,
          user_email: user.email,
          status: "PENDING",
          ip_address: ip,
          user_agent: userAgent,
          history: JSON.stringify([historyEntry]),
        }
      });

      // Enviar e-mail de notificação para tidlambsport@gmail.com
      sendPasswordResetAdminNotification({
        protocol,
        userName: user.name,
        username: cleanIdentifier,
        userEmail: user.email,
        requestDate,
        adminUrl,
      }).catch(err => {
        console.error("[ForgotPassword] Erro não-bloqueante no envio do e-mail:", err);
      });
    } else {
      console.log(`[ForgotPassword] Solicitação para identificador não localizado: "${cleanIdentifier}" (IP: ${ip}). Resposta neutra retornada.`);
    }

    return NextResponse.json({
      success: true,
      message: neutralMessage,
    });
  } catch (error: any) {
    console.error("[ForgotPassword] Erro no endpoint:", error);
    return NextResponse.json(
      { error: "Ocorreu uma falha ao processar a solicitação. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}
