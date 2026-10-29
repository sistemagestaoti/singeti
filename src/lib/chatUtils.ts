import { prisma } from "@/lib/prisma";

export interface ResolvedChatUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

/**
 * Resolve o usuário autenticado no PostgreSQL de forma resiliente.
 * Impede falhas de Foreign Key (P2003) quando a sessão contém IDs sintéticos (ex.: "admin-master")
 * ou quando o ID da sessão diverge do ID real na tabela `users`.
 */
export async function resolveChatUser(sessionUser: {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}): Promise<ResolvedChatUser | null> {
  const candidateId = sessionUser?.id || "";
  const candidateEmail = sessionUser?.email?.toLowerCase().trim() || "";

  if (candidateId && candidateId !== "admin-master") {
    const byId = await prisma.user.findUnique({
      where: { id: candidateId },
      select: { id: true, name: true, email: true, avatar: true },
    });
    if (byId) return byId;
  }

  if (candidateEmail) {
    const byEmail = await prisma.user.findUnique({
      where: { email: candidateEmail },
      select: { id: true, name: true, email: true, avatar: true },
    });
    if (byEmail) return byEmail;
  }

  // Fallback para primeiro usuário ativo (ex.: quando autenticado via contingência master)
  const fallbackAdmin = await prisma.user.findFirst({
    where: { status: { in: ["ACTIVE", "active"] } },
    orderBy: { created_at: "asc" },
    select: { id: true, name: true, email: true, avatar: true },
  });

  if (fallbackAdmin) return fallbackAdmin;

  const anyUser = await prisma.user.findFirst({
    orderBy: { created_at: "asc" },
    select: { id: true, name: true, email: true, avatar: true },
  });

  return anyUser || null;
}

export const ALLOWED_MESSAGE_TYPES = new Set([
  "text",
  "sticker",
  "gif",
  "image",
  "video",
  "audio",
  "file",
  "ticket",
]);

export const ALLOWED_STICKER_MIMES = [
  "data:image/webp;base64,",
  "data:image/png;base64,",
  "data:image/gif;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
];

// Limite máximo de payload de figurinha (1.5 MB em string Base64 ~ 1.1 MB binário)
export const MAX_STICKER_PAYLOAD_LENGTH = 1_500_000;

// Limite máximo de payload geral de mensagem/mídia no chat (4 MB em string Base64)
export const MAX_MESSAGE_PAYLOAD_LENGTH = 4_000_000;

export function validateStickerContent(content: unknown): {
  valid: boolean;
  status?: number;
  code?: string;
  message?: string;
} {
  if (typeof content !== "string" || !content.trim()) {
    return {
      valid: false,
      status: 400,
      code: "STICKER_EMPTY",
      message: "Conteúdo da figurinha não informado.",
    };
  }

  const trimmed = content.trim();

  if (trimmed.length > MAX_STICKER_PAYLOAD_LENGTH) {
    return {
      valid: false,
      status: 413,
      code: "STICKER_TOO_LARGE",
      message: "A figurinha excede o tamanho máximo permitido (1.5 MB).",
    };
  }

  const isHttpUrl =
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/");

  if (isHttpUrl) {
    // Rejeita extensões claramente inválidas em URLs de figurinha
    const lower = trimmed.split("?")[0].toLowerCase();
    const invalidExts = [".exe", ".bat", ".sh", ".cmd", ".ps1", ".php", ".js", ".html", ".pdf", ".zip"];
    if (invalidExts.some((ext) => lower.endsWith(ext))) {
      return {
        valid: false,
        status: 415,
        code: "STICKER_UNSUPPORTED_FORMAT",
        message: "Formato de figurinha não suportado. Use PNG, WebP, GIF ou JPEG.",
      };
    }
    return { valid: true };
  }

  if (trimmed.startsWith("data:")) {
    const lowerPrefix = trimmed.slice(0, 40).toLowerCase();
    const isAllowedMime = ALLOWED_STICKER_MIMES.some((prefix) =>
      lowerPrefix.startsWith(prefix)
    );
    if (!isAllowedMime) {
      return {
        valid: false,
        status: 415,
        code: "STICKER_UNSUPPORTED_MIME",
        message: "Formato de mídia inválido para figurinha. Use WebP, PNG, GIF ou JPEG.",
      };
    }

    const commaIdx = trimmed.indexOf(",");
    const base64Body = commaIdx >= 0 ? trimmed.slice(commaIdx + 1) : "";
    if (!base64Body || base64Body.length < 16) {
      return {
        valid: false,
        status: 422,
        code: "STICKER_CORRUPTED_DATA",
        message: "Os dados da figurinha estão incompletos ou corrompidos.",
      };
    }

    return { valid: true };
  }

  return {
    valid: false,
    status: 415,
    code: "STICKER_INVALID_URI",
    message: "URL ou formato de figurinha inválido.",
  };
}

/**
 * Gera resumo leve de uma mensagem para previews de canal, notificações e `/api/chat/sync`.
 * Impede que strings Base64 gigantes (`data:image/...`) trafeguem repetidamente no polling de sincronização.
 */
export function summarizeMessageContent(
  content: string | null | undefined,
  type?: string | null,
  fileName?: string | null
): string {
  const msgType = (type || "text").toLowerCase();
  if (msgType === "sticker") return "✨ Figurinha";
  if (msgType === "gif") return "🎬 GIF";
  if (msgType === "image") return "📷 Imagem";
  if (msgType === "video") return "🎥 Vídeo";
  if (msgType === "audio") return "🎤 Mensagem de voz";
  if (msgType === "file") return `📄 ${fileName || "Arquivo"}`;
  if (msgType === "ticket") return content ? content.slice(0, 140) : "🎫 Chamado";

  if (!content) return "";
  if (content.startsWith("data:image/")) return "📷 Imagem";
  if (content.startsWith("data:audio/")) return "🎤 Mensagem de voz";
  if (content.startsWith("data:video/")) return "🎥 Vídeo";
  if (content.startsWith("data:")) return `📎 ${fileName || "Anexo"}`;

  return content.length > 160 ? `${content.slice(0, 157)}...` : content;
}
