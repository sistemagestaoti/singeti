import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTicketItemsTest() {
  console.log("=== INICIANDO TESTE DO GERENCIAMENTO DE ITENS DO SERVICE DESK ===");

  try {
    // 1. Obter usuário e departamento para vincular o chamado
    const user = await prisma.user.findFirst();
    const dept = await prisma.department.findFirst();

    if (!user) throw new Error("Nenhum usuário cadastrado encontrado.");

    console.log(`[PASS] Usuário solicitante: ${user.name} (${user.id})`);

    // 2. Gerar código do chamado
    const count = await prisma.ticket.count();
    const code = `CH-${String(count + 1).padStart(4, '0')}`;

    // 3. Criar chamado com 3 itens dinâmicos
    console.log(`Criando chamado ${code} com 3 itens...`);
    const ticket = await prisma.ticket.create({
      data: {
        code,
        title: "[TESTE QA] Manutenção e Troca de Periféricos do Estoque",
        description: "Solicitação contendo múltiplos itens de hardware e rede.",
        type: "REQUEST",
        status: "NEW",
        urgency: "MEDIUM",
        impact: "LOW",
        priority: "MEDIUM",
        requester_id: user.id,
        department_id: dept?.id || null,
        items: {
          create: [
            {
              description: "Teclado Mecânico ABNT2",
              quantity: 2,
              unit: "UN",
              category: "Hardware",
              notes: "Setor de faturamento"
            },
            {
              description: "Cabo de Rede Cat6 3 metros",
              quantity: 5,
              unit: "UN",
              category: "Rede",
              notes: "Ponto extra balcão"
            },
            {
              description: "Adaptador USB para DisplayPort",
              quantity: 1,
              unit: "UN",
              category: "Acessório",
              notes: "Urgência moderada"
            }
          ]
        }
      },
      include: {
        items: true,
        requester: true
      }
    });

    console.log(`[PASS] Chamado criado: ${ticket.id} (${ticket.code}) com ${ticket.items.length} itens gravados.`);
    if (ticket.items.length !== 3) {
      throw new Error(`Esperava 3 itens, obteve ${ticket.items.length}`);
    }

    // 4. Adicionar um 4º item ao chamado existente
    console.log("Adicionando 4º item ao chamado existente...");
    const item4 = await prisma.ticketItem.create({
      data: {
        ticket_id: ticket.id,
        description: "Mouse Óptico Ergonômico",
        quantity: 2,
        unit: "UN",
        category: "Periférico",
        notes: "Item adicional solicitado após abertura"
      }
    });
    console.log(`[PASS] 4º item adicionado: ${item4.id} - ${item4.description}`);

    // 5. Editar o item 1 (alterar quantidade de 2 para 4 e atualizar notas)
    const item1 = ticket.items[0];
    console.log(`Editando item 1 (${item1.id})...`);
    const updatedItem1 = await prisma.ticketItem.update({
      where: { id: item1.id },
      data: {
        quantity: 4,
        notes: "Quantidade ajustada para atender dois postos de trabalho"
      }
    });
    console.log(`[PASS] Item 1 atualizado com sucesso: Qtd=${updatedItem1.quantity}, Notas=${updatedItem1.notes}`);
    if (updatedItem1.quantity !== 4) {
      throw new Error("FALHA: Quantidade do item 1 não foi atualizada.");
    }

    // 6. Remover o item 2 (Cabo de Rede)
    const item2 = ticket.items[1];
    console.log(`Removendo item 2 (${item2.id} - ${item2.description})...`);
    await prisma.ticketItem.delete({
      where: { id: item2.id }
    });
    console.log(`[PASS] Item 2 removido do chamado.`);

    // 7. Consultar o chamado completo e auditar os itens restantes
    const finalTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        items: { orderBy: { created_at: 'asc' } }
      }
    });

    console.log(`[PASS] Consulta ao chamado retornou ${finalTicket.items.length} itens.`);
    if (finalTicket.items.length !== 3) {
      throw new Error(`Esperava 3 itens restantes (1 atualizado, 3 original, 4 novo), obteve ${finalTicket.items.length}`);
    }

    // Validar se o item 2 realmente sumiu e se o item 1 tem quantidade 4
    const hasItem2 = finalTicket.items.some(i => i.id === item2.id);
    const it1 = finalTicket.items.find(i => i.id === item1.id);
    if (hasItem2) throw new Error("FALHA: Item 2 ainda consta na lista.");
    if (!it1 || it1.quantity !== 4) throw new Error("FALHA: Item 1 não manteve os dados atualizados.");

    console.log("[PASS] Integridade dos itens confirmada no banco:");
    finalTicket.items.forEach((it, idx) => {
      console.log(`   ${idx + 1}. [${it.category}] ${it.description} - ${it.quantity} ${it.unit} (${it.notes || 'Sem notas'})`);
    });

    // 8. Testar exclusão em cascata (remoção do chamado limpa todos os itens automaticamente)
    console.log("Testando exclusão em cascata do chamado...");
    await prisma.ticket.delete({
      where: { id: ticket.id }
    });

    const orphanItems = await prisma.ticketItem.findMany({
      where: { ticket_id: ticket.id }
    });

    if (orphanItems.length > 0) {
      throw new Error(`FALHA: Restaram ${orphanItems.length} itens órfãos após exclusão do chamado!`);
    }
    console.log("[PASS] Exclusão em cascata testada: zero itens órfãos restantes.");

    console.log("\n=== TESTE DO SERVICE DESK MULTI-ITENS CONCLUÍDO COM 100% DE SUCESSO ===");
  } catch (err) {
    console.error("ERRO NO TESTE:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTicketItemsTest();
