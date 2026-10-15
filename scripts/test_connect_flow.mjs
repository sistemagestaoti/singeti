import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runConnectTest() {
  console.log("=== INICIANDO TESTE DO CONNECT CHAT ===");

  try {
    // 1. Identificar Usuários Reais
    const userA = await prisma.user.findFirst({
      where: { name: { contains: "KASEMIRO", mode: "insensitive" } }
    });
    const userB = await prisma.user.findFirst({
      where: { name: { contains: "Joao Marcos", mode: "insensitive" } }
    });

    if (!userA || !userB) {
      throw new Error(`Usuários de teste não encontrados: UserA=${!!userA}, UserB=${!!userB}`);
    }

    console.log(`[PASS] Usuário A (Remetente): ${userA.name} (${userA.id})`);
    console.log(`[PASS] Usuário B (Destinatário): ${userB.name} (${userB.id})`);

    // 2. Localizar ou Criar Canal DM entre User A e User B
    let channel = await prisma.chatChannel.findFirst({
      where: {
        is_group: false,
        AND: [
          { members: { some: { id: userA.id } } },
          { members: { some: { id: userB.id } } }
        ]
      },
      include: { members: true }
    });

    if (!channel) {
      console.log("Criando canal direto de teste...");
      channel = await prisma.chatChannel.create({
        data: {
          is_group: false,
          name: `${userA.name} & ${userB.name}`,
          members: {
            connect: [{ id: userA.id }, { id: userB.id }]
          }
        },
        include: { members: true }
      });
    }

    console.log(`[PASS] Canal DM verificado: ${channel.id}`);

    // 3. Usuário A envia uma mensagem de teste
    const testContent = `[TESTE AUTOMATIZADO CONNECT ${new Date().toISOString()}] Mensagem enviada de A para B`;
    const message = await prisma.chatMessage.create({
      data: {
        channel_id: channel.id,
        sender_id: userA.id,
        content: testContent,
        is_read: false
      }
    });

    await prisma.chatChannel.update({
      where: { id: channel.id },
      data: { updated_at: new Date() }
    });

    console.log(`[PASS] Mensagem criada no banco: ${message.id} | is_read=${message.is_read}`);

    // 4. Testar a lógica de Sync para o Usuário B (Destinatário)
    const unreadForUserB = await prisma.chatMessage.findMany({
      where: {
        channel_id: channel.id,
        sender_id: { not: userB.id },
        is_read: false
      }
    });

    if (unreadForUserB.length === 0 || !unreadForUserB.some(m => m.id === message.id)) {
      throw new Error("FALHA: Mensagem de User A não consta como não lida para User B!");
    }
    console.log(`[PASS] Sync detectou ${unreadForUserB.length} mensagem(ns) não lida(s) para Usuário B.`);

    // 5. Simular Usuário B abrindo o canal e lendo as mensagens
    const markReadResult = await prisma.chatMessage.updateMany({
      where: {
        channel_id: channel.id,
        sender_id: { not: userB.id },
        is_read: false
      },
      data: { is_read: true }
    });

    console.log(`[PASS] Usuário B abriu o canal: ${markReadResult.count} mensagem(ns) marcada(s) como lida(s).`);

    // 6. Verificar se a mensagem original de User A agora tem is_read = true (confirmação de leitura)
    const updatedMessage = await prisma.chatMessage.findUnique({
      where: { id: message.id }
    });

    if (!updatedMessage.is_read) {
      throw new Error("FALHA: is_read não foi atualizado para true no banco de dados!");
    }
    console.log(`[PASS] Confirmação de Leitura (✓✓ duplo check) confirmada no banco: is_read=${updatedMessage.is_read}`);

    // 7. Simular Usuário B respondendo ao Usuário A
    const replyContent = `[TESTE AUTOMATIZADO CONNECT ${new Date().toISOString()}] Resposta de B para A recebida com sucesso`;
    const replyMessage = await prisma.chatMessage.create({
      data: {
        channel_id: channel.id,
        sender_id: userB.id,
        content: replyContent,
        is_read: false
      }
    });
    console.log(`[PASS] Resposta do Usuário B persistida: ${replyMessage.id}`);

    // 8. Testar Sync para Usuário A recebendo a resposta
    const unreadForUserA = await prisma.chatMessage.findMany({
      where: {
        channel_id: channel.id,
        sender_id: { not: userA.id },
        is_read: false
      }
    });

    if (!unreadForUserA.some(m => m.id === replyMessage.id)) {
      throw new Error("FALHA: Resposta de User B não consta como não lida para User A!");
    }
    console.log(`[PASS] Sync detectou resposta de User B como não lida para User A.`);

    // Marcar como lida e finalizar
    await prisma.chatMessage.update({
      where: { id: replyMessage.id },
      data: { is_read: true }
    });

    // Limpar mensagens de teste do canal
    await prisma.chatMessage.deleteMany({
      where: {
        id: { in: [message.id, replyMessage.id] }
      }
    });
    console.log("[PASS] Limpeza das mensagens de teste realizada com sucesso.");

    console.log("\n=== TESTE DO CONNECT CHAT CONCLUÍDO COM 100% DE SUCESSO ===");
  } catch (err) {
    console.error("ERRO NO TESTE:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runConnectTest();
