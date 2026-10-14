// Teste de ciclo de vida completo de chamados via API
// Usa Prisma diretamente para simular criação, leitura, update, comentário e deleção
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let ticketId = null;
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

async function main() {
  console.log('\n=== TESTE DE CICLO DE VIDA DE CHAMADOS ===\n');

  // 1. Buscar usuário existente
  const user = await prisma.user.findFirst({ select: { id: true, name: true } });
  assert(user, 'Existe pelo menos 1 usuário no banco');
  console.log(`  ▸ Usando usuário: ${user.name} (${user.id})\n`);

  // Buscar company_id
  const company = await prisma.company.findFirst({ select: { id: true } });
  assert(company, 'Existe pelo menos 1 empresa no banco');

  // Gerar próximo code sequencial
  const lastTicket = await prisma.ticket.findFirst({ orderBy: { code: 'desc' }, select: { code: true } });
  let nextNum = 1;
  if (lastTicket && lastTicket.code) {
    const match = lastTicket.code.match(/(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const nextCode = `CH-${String(nextNum).padStart(7, '0')}`;
  console.log(`  ▸ Próximo código: ${nextCode}`);

  // 2. Criar chamado via Prisma
  console.log('--- 1. CRIAÇÃO DE CHAMADO ---');
  const ticket = await prisma.ticket.create({
    data: {
      code: nextCode,
      title: '[TESTE E2E] Chamado de Teste Automatizado',
      description: 'Descrição do chamado de teste automatizado para validar o fluxo completo.',
      type: 'INCIDENT',
      status: 'NEW',
      urgency: 'HIGH',
      impact: 'MEDIUM',
      priority: 'HIGH',
      requester_id: user.id,
      company_id: company.id
    }
  });
  ticketId = ticket.id;
  assert(ticket.id, 'Chamado criado com sucesso (ID: ' + ticket.id + ')');
  assert(ticket.code, 'Código gerado automaticamente: ' + ticket.code);
  assert(ticket.status === 'NEW', 'Status inicial é NEW');
  assert(ticket.title.includes('[TESTE E2E]'), 'Título salvo corretamente');
  assert(ticket.requester_id === user.id, 'Solicitante vinculado corretamente');

  // 3. Listar e verificar que aparece
  console.log('\n--- 2. LISTAGEM DE CHAMADOS ---');
  const allTickets = await prisma.ticket.findMany({
    where: { requester_id: user.id },
    include: { requester: { select: { id: true, name: true } } }
  });
  assert(allTickets.some(t => t.id === ticketId), 'Chamado de teste aparece na listagem');
  assert(allTickets.every(t => t.requester), 'Todos os chamados têm requester preenchido');

  // 4. Buscar por ID
  console.log('\n--- 3. BUSCA POR ID (Detalhes) ---');
  const found = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: { select: { id: true, name: true } },
      assigned_to: { select: { id: true, name: true } },
      items: true,
      comments: { include: { author: { select: { id: true, name: true } } } },
      category: true,
      department: true,
      asset: true
    }
  });
  assert(found, 'Chamado encontrado por ID');
  assert(found.requester?.name === user.name, 'Requester populado corretamente: ' + found.requester?.name);
  assert(found.comments.length === 0, 'Inicialmente sem comentários');
  assert(found.items.length === 0, 'Inicialmente sem itens');

  // 5. Adicionar itens ao chamado
  console.log('\n--- 4. ADIÇÃO DE ITENS ---');
  const item1 = await prisma.ticketItem.create({
    data: {
      ticket_id: ticketId,
      description: 'Teclado USB Corporativo',
      quantity: 2,
      unit: 'UN',
      category: 'Hardware'
    }
  });
  assert(item1.id, 'Item 1 criado: ' + item1.description);
  assert(item1.quantity === 2, 'Quantidade correta: ' + item1.quantity);

  const item2 = await prisma.ticketItem.create({
    data: {
      ticket_id: ticketId,
      description: 'Monitor LED 24"',
      quantity: 1,
      unit: 'UN',
      category: 'Hardware',
      notes: 'Dell P2422H - patrimônio PT-4521'
    }
  });
  assert(item2.id, 'Item 2 criado: ' + item2.description);

  const itemsCheck = await prisma.ticketItem.findMany({ where: { ticket_id: ticketId } });
  assert(itemsCheck.length === 2, 'Total de itens do chamado: 2');

  // 6. Editar item
  console.log('\n--- 5. EDIÇÃO DE ITEM ---');
  const updatedItem = await prisma.ticketItem.update({
    where: { id: item1.id },
    data: { quantity: 3, notes: 'Urgente - setor financeiro' }
  });
  assert(updatedItem.quantity === 3, 'Quantidade atualizada para 3');
  assert(updatedItem.notes === 'Urgente - setor financeiro', 'Notas atualizadas');

  // 7. Atualizar status
  console.log('\n--- 6. ATUALIZAÇÃO DE STATUS ---');
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'IN_PROGRESS', assigned_to_id: user.id }
  });
  assert(updated.status === 'IN_PROGRESS', 'Status atualizado para IN_PROGRESS');
  assert(updated.assigned_to_id === user.id, 'Técnico atribuído');

  // 8. Adicionar comentário
  console.log('\n--- 7. ADIÇÃO DE COMENTÁRIO ---');
  const comment = await prisma.ticketComment.create({
    data: {
      ticket_id: ticketId,
      author_id: user.id,
      content: 'Iniciando atendimento. Solicitados os equipamentos.',
      is_internal: false
    }
  });
  assert(comment.id, 'Comentário criado com sucesso');
  assert(comment.author_id === user.id, 'Author_id correto (FK válida)');

  const internalNote = await prisma.ticketComment.create({
    data: {
      ticket_id: ticketId,
      author_id: user.id,
      content: 'Nota interna: verificar estoque antes de finalizar.',
      is_internal: true
    }
  });
  assert(internalNote.is_internal === true, 'Nota interna marcada corretamente');

  // 9. Verificar persistência completa
  console.log('\n--- 8. VERIFICAÇÃO DE PERSISTÊNCIA ---');
  const fullTicket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: { select: { name: true } },
      assigned_to: { select: { name: true } },
      items: true,
      comments: { include: { author: { select: { name: true } } }, orderBy: { created_at: 'asc' } }
    }
  });
  assert(fullTicket.status === 'IN_PROGRESS', 'Status persiste: IN_PROGRESS');
  assert(fullTicket.items.length === 2, '2 itens persistes');
  assert(fullTicket.comments.length === 2, '2 comentários persistes');
  assert(fullTicket.comments[0].author?.name === user.name, 'Author do comentário populado');
  assert(fullTicket.assigned_to?.name === user.name, 'Assigned_to populado');

  // 10. Resolver chamado
  console.log('\n--- 9. RESOLUÇÃO DO CHAMADO ---');
  const resolved = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'RESOLVED', resolved_at: new Date() }
  });
  assert(resolved.status === 'RESOLVED', 'Status: RESOLVED');
  assert(resolved.resolved_at !== null, 'resolved_at preenchido');

  // 11. Fechar chamado
  console.log('\n--- 10. FECHAMENTO DO CHAMADO ---');
  const closed = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'CLOSED', closed_at: new Date() }
  });
  assert(closed.status === 'CLOSED', 'Status: CLOSED');
  assert(closed.closed_at !== null, 'closed_at preenchido');

  // 12. Remover item
  console.log('\n--- 11. REMOÇÃO DE ITEM ---');
  await prisma.ticketItem.delete({ where: { id: item2.id } });
  const remainingItems = await prisma.ticketItem.findMany({ where: { ticket_id: ticketId } });
  assert(remainingItems.length === 1, 'Resta apenas 1 item após remoção');

  // 13. Limpeza: deletar chamado de teste
  console.log('\n--- 12. LIMPEZA (EXCLUSÃO DO CHAMADO DE TESTE) ---');
  await prisma.ticketComment.deleteMany({ where: { ticket_id: ticketId } });
  await prisma.ticketItem.deleteMany({ where: { ticket_id: ticketId } });
  await prisma.ticket.delete({ where: { id: ticketId } });
  const deleted = await prisma.ticket.findUnique({ where: { id: ticketId } });
  assert(!deleted, 'Chamado de teste excluído do banco (sem resíduos)');

  // Resultado final
  console.log('\n' + '='.repeat(50));
  console.log(`RESULTADO: ${passed} aprovados, ${failed} falhas`);
  if (failed > 0) {
    console.error('\n⚠️  ATENÇÃO: Existem falhas que precisam ser corrigidas.');
    process.exitCode = 1;
  } else {
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
  }
  console.log('='.repeat(50) + '\n');

  await prisma['$disconnect']();
}

main().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
