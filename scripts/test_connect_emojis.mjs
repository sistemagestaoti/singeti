import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function assert(condition, msg) {
  if (!condition) {
    throw new Error(`FALHA DE TESTE: ${msg}`);
  }
}

async function runEmojiSuite() {
  console.log("=== INICIANDO SUÍTE DE TESTES DO SISTEMA DE EMOJIS — SYNGETI CONNECT CHAT ===\n");

  const users = await prisma.user.findMany({ take: 3, orderBy: { created_at: "asc" } });
  assert(users.length >= 2, "Pelo menos 2 usuários são necessários no banco.");
  const userA = users[0];
  const userB = users[1];

  const channel = await prisma.chatChannel.create({
    data: {
      name: `__TEST_EMOJI_CHANNEL_${Date.now()}`,
      is_group: true,
      admin_id: userA.id,
      members: {
        connect: users.map((u) => ({ id: u.id })),
      },
    },
  });

  try {
    // 1. Teste de Mensagem com Emojis Simples, Múltiplos e Sequências Compostas Unicode (ZWJ + Tom de Pele)
    const compositeText = "Bom dia, equipe! 😀 Vamos iniciar os trabalhos! 🚀👍🏽🧑‍💻🇧🇷";
    const msg = await prisma.chatMessage.create({
      data: {
        channel_id: channel.id,
        sender_id: userA.id,
        content: compositeText,
        type: "text",
        client_id: `emoji_test_${crypto.randomUUID()}`,
        status: "SENT",
      },
    });

    const loadedMsg = await prisma.chatMessage.findUnique({ where: { id: msg.id } });
    assert(
      loadedMsg && loadedMsg.content === compositeText,
      "Emojis simples e compostos (ZWJ / Fitzpatrick) devem ser preservados integralmente no PostgreSQL."
    );
    console.log("✔ [TESTE 1] Persistência de texto com emojis simples, múltiplos e sequências compostas Unicode: APROVADO");

    // 2. Teste de Reações: Adicionar, Unicidade (impedir duplicação pelo mesmo usuário) e Múltiplos Usuários
    const r1 = await prisma.chatMessageReaction.create({
      data: {
        message_id: msg.id,
        user_id: userA.id,
        emoji: "👍",
      },
    });
    assert(r1.id, "Reação 👍 de userA deve ser criada.");

    // Tentar duplicar a mesma reação (message_id + user_id + emoji) deve lançar erro de constraint única P2002
    let duplicateBlocked = false;
    try {
      await prisma.chatMessageReaction.create({
        data: {
          message_id: msg.id,
          user_id: userA.id,
          emoji: "👍",
        },
      });
    } catch (e) {
      duplicateBlocked = true;
    }
    assert(duplicateBlocked, "Constraint @@unique([message_id, user_id, emoji]) deve impedir reação duplicada.");

    // Segundo usuário reage com o mesmo emoji 👍 e também com 🎉
    await prisma.chatMessageReaction.create({
      data: {
        message_id: msg.id,
        user_id: userB.id,
        emoji: "👍",
      },
    });
    await prisma.chatMessageReaction.create({
      data: {
        message_id: msg.id,
        user_id: userB.id,
        emoji: "🎉",
      },
    });

    const allReactions = await prisma.chatMessageReaction.findMany({
      where: { message_id: msg.id },
      include: { user: { select: { id: true, name: true } } },
    });
    assert(allReactions.length === 3, `Esperado 3 reações totais na mensagem, encontrado ${allReactions.length}`);
    const thumbsCount = allReactions.filter((r) => r.emoji === "👍").length;
    assert(thumbsCount === 2, "Contagem do emoji 👍 entre 2 usuários deve ser exatamente 2.");

    // Remover reação de userA e verificar preservação da reação de userB
    await prisma.chatMessageReaction.delete({ where: { id: r1.id } });
    const afterRemove = await prisma.chatMessageReaction.findMany({ where: { message_id: msg.id } });
    assert(afterRemove.length === 2, "Após remoção da reação de userA, as reações de userB devem permanecer intactas.");
    console.log("✔ [TESTE 2] Reações (adição, remoção, bloqueio de duplicatas, múltiplos usuários e contadores): APROVADO");

    // 3. Teste de Persistência de Recentes, Favoritos e Tom de Pele por Usuário no Supabase
    const sampleRecents = ["🚀", "😀", "👍🏽", "☕"];
    const sampleFavorites = ["❤️", "✅", "🎉"];
    const sampleSkinTone = "\u{1F3FD}";

    await prisma.chatUserSettings.upsert({
      where: { user_id: userA.id },
      update: {
        recent_emojis: JSON.stringify(sampleRecents),
        favorite_emojis: JSON.stringify(sampleFavorites),
        emoji_skin_tone: sampleSkinTone,
      },
      create: {
        user_id: userA.id,
        recent_emojis: JSON.stringify(sampleRecents),
        favorite_emojis: JSON.stringify(sampleFavorites),
        emoji_skin_tone: sampleSkinTone,
      },
    });

    const savedPrefs = await prisma.chatUserSettings.findUnique({
      where: { user_id: userA.id },
    });
    assert(savedPrefs, "Preferências do usuário devem existir no banco.");
    assert(
      JSON.parse(savedPrefs.recent_emojis).join(",") === sampleRecents.join(","),
      "Lista de emojis recentes deve ser recuperada com exatidão."
    );
    assert(
      JSON.parse(savedPrefs.favorite_emojis).join(",") === sampleFavorites.join(","),
      "Lista de emojis favoritos deve ser recuperada com exatidão."
    );
    assert(
      savedPrefs.emoji_skin_tone === sampleSkinTone,
      "Modificador de tom de pele deve ser persistido e recuperado."
    );
    console.log("✔ [TESTE 3] Persistência de Recentes, Favoritos e Tom de Pele no Supabase (ChatUserSettings): APROVADO");

    // 4. Teste de Integridade do Conteúdo Original ao Reagir
    const msgAfterReactions = await prisma.chatMessage.findUnique({ where: { id: msg.id } });
    assert(
      msgAfterReactions.content === compositeText,
      "Reações jamais devem alterar o conteúdo original da mensagem."
    );
    console.log("✔ [TESTE 4] Imutabilidade do conteúdo original da mensagem após múltiplas reações: APROVADO");

    console.log("\n=== TODAS AS SUÍTES DO SISTEMA DE EMOJIS PASSARAM COM 100% DE SUCESSO ===");
  } finally {
    await prisma.chatMessageReaction.deleteMany({ where: { message: { channel_id: channel.id } } });
    await prisma.chatMessage.deleteMany({ where: { channel_id: channel.id } });
    await prisma.chatChannel.delete({ where: { id: channel.id } });
    await prisma.$disconnect();
  }
}

runEmojiSuite().catch((err) => {
  console.error("\n❌ ERRO NA SUÍTE DE EMOJIS:", err);
  process.exit(1);
});
