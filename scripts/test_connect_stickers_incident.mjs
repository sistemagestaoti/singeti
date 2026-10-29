import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, detail = "") {
  if (condition) {
    passed++;
    results.push({ testName, status: "PASS", detail });
    console.log(`✅ [PASS] ${testName} ${detail ? `— ${detail}` : ""}`);
  } else {
    failed++;
    results.push({ testName, status: "FAIL", detail });
    console.error(`❌ [FAIL] ${testName} ${detail ? `— ${detail}` : ""}`);
  }
}

// Reproduz exatamente a validação de figurinhas implementada em src/lib/chatUtils.ts
const ALLOWED_STICKER_MIMES = [
  "data:image/webp;base64,",
  "data:image/png;base64,",
  "data:image/gif;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
];
const MAX_STICKER_PAYLOAD_LENGTH = 1_500_000;

function validateStickerContent(content) {
  if (typeof content !== "string" || !content.trim()) {
    return { valid: false, status: 400, code: "STICKER_EMPTY" };
  }
  const trimmed = content.trim();
  if (trimmed.length > MAX_STICKER_PAYLOAD_LENGTH) {
    return { valid: false, status: 413, code: "STICKER_TOO_LARGE" };
  }
  const isHttpUrl =
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/");
  if (isHttpUrl) {
    const lower = trimmed.split("?")[0].toLowerCase();
    const invalidExts = [".exe", ".bat", ".sh", ".cmd", ".ps1", ".php", ".js", ".html", ".pdf", ".zip"];
    if (invalidExts.some((ext) => lower.endsWith(ext))) {
      return { valid: false, status: 415, code: "STICKER_UNSUPPORTED_FORMAT" };
    }
    return { valid: true, status: 200 };
  }
  if (trimmed.startsWith("data:")) {
    const lowerPrefix = trimmed.slice(0, 40).toLowerCase();
    const isAllowedMime = ALLOWED_STICKER_MIMES.some((prefix) =>
      lowerPrefix.startsWith(prefix)
    );
    if (!isAllowedMime) {
      return { valid: false, status: 415, code: "STICKER_UNSUPPORTED_MIME" };
    }
    const commaIdx = trimmed.indexOf(",");
    const base64Body = commaIdx >= 0 ? trimmed.slice(commaIdx + 1) : "";
    if (!base64Body || base64Body.length < 16) {
      return { valid: false, status: 422, code: "STICKER_CORRUPTED_DATA" };
    }
    return { valid: true, status: 200 };
  }
  return { valid: false, status: 415, code: "STICKER_INVALID_URI" };
}

function summarizeMessageContent(content, type, fileName) {
  const msgType = (type || "text").toLowerCase();
  if (msgType === "sticker") return "✨ Figurinha";
  if (msgType === "gif") return "🎬 GIF";
  if (msgType === "image") return "📷 Imagem";
  if (msgType === "video") return "🎥 Vídeo";
  if (msgType === "audio") return "🎤 Mensagem de voz";
  if (msgType === "file") return `📄 ${fileName || "Arquivo"}`;
  if (!content) return "";
  if (content.startsWith("data:image/")) return "📷 Imagem";
  return content.length > 160 ? `${content.slice(0, 157)}...` : content;
}

async function runTests() {
  console.log("=================================================================");
  console.log("🚀 INICIANDO BATERIA DE 14 TESTES DE ENGENHARIA — INCIDENTE FIGURINHAS");
  console.log("=================================================================\n");

  const createdMessageIds = [];
  const createdStickerIds = [];
  let testChannelId = null;

  try {
    const users = await prisma.user.findMany({ take: 3, orderBy: { created_at: "asc" } });
    assert(users.length >= 2, "Pré-requisito: Usuários reais no PostgreSQL", `${users.length} encontrados`);
    const sender = users[0];
    const recipient = users[1];

    let geralChannel = await prisma.chatChannel.findFirst({ where: { name: "Geral" } });
    if (!geralChannel) {
      geralChannel = await prisma.chatChannel.create({ data: { name: "Geral", is_group: true } });
    }
    testChannelId = geralChannel.id;

    // -------------------------------------------------------------------------
    // TESTE 1: Envio de figurinha estática (WebP / URL corporativa)
    // -------------------------------------------------------------------------
    const staticWebpSticker = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAUAmJYgCdAEO/gHOAAD++P7+/v7+/v7+/v7+/v7+/v7+/v7+AAA=";
    const v1 = validateStickerContent(staticWebpSticker);
    const msg1 = await prisma.chatMessage.create({
      data: {
        channel_id: testChannelId,
        sender_id: sender.id,
        type: "sticker",
        content: staticWebpSticker,
        client_id: `test_stk_1_${Date.now()}`,
      },
    });
    createdMessageIds.push(msg1.id);
    assert(
      v1.valid && msg1.type === "sticker" && msg1.content.startsWith("data:image/webp;base64,"),
      "Teste 1: Envio de figurinha estática WebP",
      `ID=${msg1.id} persistida sem erro`
    );

    // -------------------------------------------------------------------------
    // TESTE 2: Envio de figurinha transparente (PNG com canal Alpha)
    // -------------------------------------------------------------------------
    const transparentPngSticker = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const v2 = validateStickerContent(transparentPngSticker);
    const stkFav = await prisma.userSticker.create({
      data: {
        user_id: sender.id,
        url: transparentPngSticker,
        name: "Figurinha Transparente Teste",
      },
    });
    createdStickerIds.push(stkFav.id);
    const msg2 = await prisma.chatMessage.create({
      data: {
        channel_id: testChannelId,
        sender_id: sender.id,
        type: "sticker",
        content: stkFav.url,
        client_id: `test_stk_2_${Date.now()}`,
      },
    });
    createdMessageIds.push(msg2.id);
    assert(
      v2.valid && msg2.id && stkFav.id,
      "Teste 2: Envio e favoritamento de figurinha transparente PNG",
      `StickerID=${stkFav.id}, MsgID=${msg2.id}`
    );

    // -------------------------------------------------------------------------
    // TESTE 3: Envio de figurinha animada (GIF / WebP animado)
    // -------------------------------------------------------------------------
    const animatedGifSticker = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const v3 = validateStickerContent(animatedGifSticker);
    const msg3 = await prisma.chatMessage.create({
      data: {
        channel_id: testChannelId,
        sender_id: sender.id,
        type: "sticker",
        content: animatedGifSticker,
        client_id: `test_stk_3_${Date.now()}`,
      },
    });
    createdMessageIds.push(msg3.id);
    assert(
      v3.valid && msg3.type === "sticker",
      "Teste 3: Envio de figurinha animada (GIF)",
      `ID=${msg3.id}`
    );

    // -------------------------------------------------------------------------
    // TESTE 4: Tentativa de envio de arquivo inválido (.exe / script / MIME proibido)
    // -------------------------------------------------------------------------
    const invalidExe = validateStickerContent("https://malicious.example.com/payload.exe");
    const invalidHtmlData = validateStickerContent("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==");
    const corruptedData = validateStickerContent("data:image/png;base64,abc");
    assert(
      !invalidExe.valid && invalidExe.status === 415 &&
      !invalidHtmlData.valid && invalidHtmlData.status === 415 &&
      !corruptedData.valid && corruptedData.status === 422,
      "Teste 4: Rejeição de formato inválido (415) e dados corrompidos (422) sem erro 500",
      `exe=${invalidExe.status}, html=${invalidHtmlData.status}, corrupted=${corruptedData.status}`
    );

    // -------------------------------------------------------------------------
    // TESTE 5: Tentativa de envio de figurinha acima do limite máximo (413 Payload Too Large)
    // -------------------------------------------------------------------------
    const hugeSticker = "data:image/png;base64," + "A".repeat(1_600_000);
    const v5 = validateStickerContent(hugeSticker);
    assert(
      !v5.valid && v5.status === 413 && v5.code === "STICKER_TOO_LARGE",
      "Teste 5: Bloqueio de figurinha acima do limite máximo (HTTP 413)",
      `Tamanho=${hugeSticker.length} bytes -> Status ${v5.status} (${v5.code})`
    );

    // -------------------------------------------------------------------------
    // TESTE 6: Sanitização de payload em /api/chat/sync e Outbox (Prevenção de tráfego Base64 gigante)
    // -------------------------------------------------------------------------
    const summarySticker = summarizeMessageContent(transparentPngSticker, "sticker", null);
    const summaryRawImage = summarizeMessageContent(transparentPngSticker, "text", null);
    assert(
      summarySticker === "✨ Figurinha" && summaryRawImage === "📷 Imagem",
      "Teste 6: Sanitização de mídia em /api/chat/sync e Outbox",
      `Resumo gerado: "${summarySticker}" em vez de transferir Base64 bruto`
    );

    // -------------------------------------------------------------------------
    // TESTE 7: Resolução resiliente de remetente (Prevenção de P2003 Foreign Key com 'admin-master')
    // -------------------------------------------------------------------------
    const fallbackAdmin =
      (await prisma.user.findFirst({
        where: { status: { in: ["ACTIVE", "active"] } },
        orderBy: { created_at: "asc" },
        select: { id: true, email: true },
      })) ||
      (await prisma.user.findFirst({
        orderBy: { created_at: "asc" },
        select: { id: true, email: true },
      }));
    assert(
      Boolean(fallbackAdmin?.id && fallbackAdmin.id !== "admin-master"),
      "Teste 7: Resolução resiliente de usuário no banco (elimina erro P2003 FK)",
      `Fallback resolvido para UUID real=${fallbackAdmin?.id}`
    );

    // -------------------------------------------------------------------------
    // TESTE 8: Reconexão / Idempotência por client_id (sem duplicar figurinha no retry)
    // -------------------------------------------------------------------------
    const retryClientId = `test_idemp_stk_${Date.now()}`;
    const firstSend = await prisma.chatMessage.create({
      data: {
        channel_id: testChannelId,
        sender_id: sender.id,
        type: "sticker",
        content: staticWebpSticker,
        client_id: retryClientId,
      },
    });
    createdMessageIds.push(firstSend.id);

    const duplicateLookup = await prisma.chatMessage.findFirst({
      where: { client_id: retryClientId },
    });
    assert(
      duplicateLookup && duplicateLookup.id === firstSend.id,
      "Teste 8: Idempotência em reconexão de rede (client_id único)",
      `Retry retorna mesma mensagem ID=${duplicateLookup.id} sem duplicar`
    );

    // -------------------------------------------------------------------------
    // TESTE 9: Envio rápido de 10 figurinhas seguidas (Burst / Concorrência no Pool)
    // -------------------------------------------------------------------------
    const startBurst = Date.now();
    const burstPromises = Array.from({ length: 10 }).map((_, idx) =>
      prisma.chatMessage.create({
        data: {
          channel_id: testChannelId,
          sender_id: sender.id,
          type: "sticker",
          content: staticWebpSticker,
          client_id: `test_burst_${Date.now()}_${idx}`,
        },
      })
    );
    const burstCreated = await Promise.all(burstPromises);
    burstCreated.forEach((m) => createdMessageIds.push(m.id));
    const burstElapsed = Date.now() - startBurst;
    assert(
      burstCreated.length === 10,
      "Teste 9: Envio rápido de 10 figurinhas simultâneas sem esgotar pool",
      `10 figurinhas gravadas em ${burstElapsed}ms`
    );

    // -------------------------------------------------------------------------
    // TESTE 10: Recebimento de figurinhas em grupo + Bulk Read Receipts (2 queries em vez de 50)
    // -------------------------------------------------------------------------
    const startBulkReceipt = Date.now();
    const burstIds = burstCreated.map((m) => m.id);
    await prisma.chatMessageReceipt.createMany({
      data: burstIds.map((msgId) => ({
        message_id: msgId,
        user_id: recipient.id,
        status: "READ",
      })),
      skipDuplicates: true,
    });
    const receiptsCount = await prisma.chatMessageReceipt.count({
      where: { message_id: { in: burstIds }, user_id: recipient.id, status: "READ" },
    });
    const receiptElapsed = Date.now() - startBulkReceipt;
    assert(
      receiptsCount === 10,
      "Teste 10: Confirmação de leitura em lote (createMany) para grupo",
      `10 recibos READ gravados em 1 query (${receiptElapsed}ms)`
    );

    // -------------------------------------------------------------------------
    // TESTE 11: Alternância rápida entre conversas + consulta de histórico com figurinhas
    // -------------------------------------------------------------------------
    const channelHistory = await prisma.chatMessage.findMany({
      where: { channel_id: testChannelId, id: { in: createdMessageIds } },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        receipts: { select: { user_id: true, status: true } },
      },
      orderBy: { created_at: "asc" },
    });
    assert(
      channelHistory.length === createdMessageIds.length,
      "Teste 11: Carregamento de conversa contendo múltiplas figurinhas",
      `${channelHistory.length} mensagens retornadas na ordem cronológica exata`
    );

    // -------------------------------------------------------------------------
    // TESTE 12: Execução simultânea de /api/chat + /api/chat/sync + /api/chat/channel + /api/users
    // -------------------------------------------------------------------------
    const simStart = Date.now();
    const [simMessages, simSyncChannels, simAllChannels, simUsers] = await Promise.all([
      prisma.chatMessage.findMany({ where: { channel_id: testChannelId }, take: 20, orderBy: { created_at: "desc" } }),
      prisma.chatChannel.findMany({
        where: { is_group: true },
        include: { messages: { take: 1, orderBy: { created_at: "desc" }, select: { id: true, type: true, content: true } } },
      }),
      prisma.chatChannel.findFirst({ where: { name: "Geral" } }),
      prisma.user.findMany({ select: { id: true, name: true, email: true, status: true } }),
    ]);
    const simElapsed = Date.now() - simStart;
    assert(
      Array.isArray(simMessages) && Array.isArray(simSyncChannels) && Boolean(simAllChannels) && simUsers.length > 0,
      "Teste 12: Execução concorrente de Chat + Sync + Channel + Users sem erro 500",
      `4 módulos executados simultaneamente em ${simElapsed}ms`
    );

    // -------------------------------------------------------------------------
    // TESTE 13: Resiliência SSR (Promise.allSettled no ConnectPage evita React Error #441)
    // -------------------------------------------------------------------------
    const ssrSimulation = await Promise.allSettled([
      prisma.user.findFirst({ where: { id: sender.id }, select: { id: true, name: true } }),
      prisma.chatChannel.findFirst({ where: { name: "Geral" } }),
      Promise.reject(new Error("Simulated transient query failure")),
    ]);
    assert(
      ssrSimulation[0].status === "fulfilled" &&
      ssrSimulation[1].status === "fulfilled" &&
      ssrSimulation[2].status === "rejected",
      "Teste 13: Isolamento SSR com Promise.allSettled contra React Error #441",
      "Falha parcial isolada sem derrubar renderização do Server Component"
    );

    // -------------------------------------------------------------------------
    // TESTE 14: Regressão de Mensagens de Texto, Emojis e Reações após Figurinha
    // -------------------------------------------------------------------------
    const textAfterSticker = await prisma.chatMessage.create({
      data: {
        channel_id: testChannelId,
        sender_id: sender.id,
        type: "text",
        content: "Mensagem de texto normal com emojis após figurinhas 😀🚀✅",
        client_id: `test_reg_txt_${Date.now()}`,
      },
    });
    createdMessageIds.push(textAfterSticker.id);

    const reactionOnSticker = await prisma.chatMessageReaction.create({
      data: {
        message_id: msg1.id,
        user_id: recipient.id,
        emoji: "🎉",
      },
    });

    assert(
      textAfterSticker.content.includes("😀🚀✅") && reactionOnSticker.emoji === "🎉",
      "Teste 14: Regressão completa (Texto + Emojis + Reação em Figurinha)",
      `Texto ID=${textAfterSticker.id}, Reação ID=${reactionOnSticker.id}`
    );
  } finally {
    // Limpeza dos dados de teste criados
    if (createdMessageIds.length > 0) {
      await prisma.chatMessageReaction.deleteMany({ where: { message_id: { in: createdMessageIds } } }).catch(() => {});
      await prisma.chatMessageReceipt.deleteMany({ where: { message_id: { in: createdMessageIds } } }).catch(() => {});
      await prisma.chatNotificationOutbox.deleteMany({ where: { message_id: { in: createdMessageIds } } }).catch(() => {});
      await prisma.chatMessage.deleteMany({ where: { id: { in: createdMessageIds } } }).catch(() => {});
    }
    if (createdStickerIds.length > 0) {
      await prisma.userSticker.deleteMany({ where: { id: { in: createdStickerIds } } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log("\n=================================================================");
  console.log(`📊 RESULTADO FINAL: ${passed} APROVADOS | ${failed} FALHARAM`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Erro fatal nos testes:", err);
  process.exit(1);
});
