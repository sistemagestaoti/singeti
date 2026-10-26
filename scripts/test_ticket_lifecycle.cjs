const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('=== INICIANDO TESTE DO CICLO DE VIDA DO CHAMADO (SYMGEST ERP) ===\n');

  try {
    // 1. Obter usuário e empresa existentes
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('Nenhum usuário encontrado no banco de dados.');

    console.log(`[TEST 1] Usuário base: ${user.name} (${user.email}) - Empresa: ${user.company_id}`);

    // 2. Criar chamado com Responsável Manual ("João Marcos") e Itens Manuais
    const count = await prisma.ticket.count();
    const code = `TEST-${String(count + 1).padStart(7, '0')}`;

    console.log(`[TEST 2] Criando chamado ${code} com Responsável Manual 'João Marcos' e 2 Itens...`);
    const ticket = await prisma.ticket.create({
      data: {
        code,
        title: "Teste Automatizado de Responsável Manual e Itens",
        description: "Chamado de teste com itens e responsável digitado livremente.",
        type: "REQUEST",
        status: "NEW",
        priority: "HIGH",
        requester_id: user.id,
        company_id: user.company_id,
        assigned_to_name: "João Marcos",
        items: {
          create: [
            {
              description: "Mouse sem fio óptico",
              quantity: 2,
              unit: "UN",
              notes: "Cor preta USB",
              status: "PENDING"
            },
            {
              description: "Teclado mecânico ABNT2",
              quantity: 1,
              unit: "UN",
              notes: "Switch silencioso",
              status: "PENDING"
            }
          ]
        }
      },
      include: {
        items: true,
        requester: true,
        assigned_to: true
      }
    });

    console.log(` Chamado criado com ID: ${ticket.id}`);
    console.log(` Responsável gravado: '${ticket.assigned_to_name}' (assigned_to_id: ${ticket.assigned_to_id || 'null'})`);
    console.log(` Itens gravados no banco: ${ticket.items.length}`);
    ticket.items.forEach((it, idx) => {
      console.log(`    Item #${idx + 1}: ${it.description} | Qtd: ${it.quantity} ${it.unit} | Obs: ${it.notes}`);
    });

    if (ticket.assigned_to_name !== "João Marcos") {
      throw new Error(`Falha: assigned_to_name esperado 'João Marcos', obteve '${ticket.assigned_to_name}'`);
    }
    if (ticket.items.length !== 2) {
      throw new Error(`Falha: esperava 2 itens, obteve ${ticket.items.length}`);
    }

    // 3. Adicionar mais um item ao chamado existente (simulando API POST /api/tickets/[id]/items)
    console.log('\n[TEST 3] Adicionando novo item avulso ao chamado (Cabo HDMI 2.0)...');
    const newItem = await prisma.ticketItem.create({
      data: {
        ticket_id: ticket.id,
        description: "Cabo HDMI 2.0 de 3 metros",
        quantity: 3,
        unit: "UN",
        notes: "Uso em sala de reunião",
        status: "PENDING"
      }
    });
    console.log(` Item avulso adicionado com sucesso: ID ${newItem.id} - ${newItem.description} (${newItem.quantity} ${newItem.unit})`);

    // 4. Atualizar item existente (simulando API PATCH /api/tickets/[id]/items/[itemId])
    console.log('\n[TEST 4] Atualizando quantidade do Item 1 para 5 unidades...');
    const updatedItem = await prisma.ticketItem.update({
      where: { id: ticket.items[0].id },
      data: { quantity: 5, unit: "CX", notes: "Alterado para caixas com 5 unidades" }
    });
    console.log(` Item 1 atualizado: Qtd=${updatedItem.quantity} ${updatedItem.unit} | Obs=${updatedItem.notes}`);

    // 5. Atualizar responsável manual para outro nome (simulando PATCH /api/tickets/[id])
    console.log('\n[TEST 5] Atualizando Responsável Manual para "Mariana Santos - Suporte N2"...');
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assigned_to_id: null,
        assigned_to_name: "Mariana Santos - Suporte N2"
      },
      include: {
        items: true
      }
    });
    console.log(` Responsável atualizado no banco: '${updatedTicket.assigned_to_name}'`);
    console.log(` Total de itens no chamado recarregado: ${updatedTicket.items.length}`);

    // 6. Testar busca pelo responsável manual (simulando GET /api/tickets?search=Mariana)
    console.log('\n[TEST 6] Testando busca na query de tickets por "Mariana"...');
    const searchResults = await prisma.ticket.findMany({
      where: {
        company_id: user.company_id,
        OR: [
          { assigned_to_name: { contains: "Mariana" } }
        ]
      }
    });
    console.log(` Encontrados ${searchResults.length} chamado(s) com responsável manual 'Mariana'`);
    if (searchResults.length === 0) {
      throw new Error('Falha na busca por responsável manual');
    }

    // 7. Cleanup
    console.log('\n[TEST 7] Limpando chamado de teste...');
    await prisma.ticket.delete({
      where: { id: ticket.id }
    });
    console.log(' Chamado de teste removido com sucesso (itens excluídos em cascata).');

    console.log('\n======================================================');
    console.log(' TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ ERRO NO TESTE:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
