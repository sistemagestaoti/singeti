const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runE2EAudit() {
  console.log("==========================================");
  console.log("INICIANDO AUDITORIA E2E E BANCO DE DADOS");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASSOU: ${message}`);
      passed++;
      results.push({ test: message, status: 'PASS' });
    } else {
      console.log(`❌ FALHOU: ${message}`);
      failed++;
      results.push({ test: message, status: 'FAIL' });
    }
  }

  try {
    // 1. Users & Authentication (Data layer)
    console.log("\n--- FASE 3: USUÁRIOS E AUTENTICAÇÃO ---");
    let admin = await prisma.user.findFirst({ where: { email: "admin@singeti.com" } });
    if (!admin) {
      // Find any user
      admin = await prisma.user.findFirst();
    }
    assert(admin !== null, "Encontrou usuário administrador no banco");

    const role = await prisma.role.findFirst();
    assert(role !== null, "Encontrou perfil (Role) configurado");

    const newUserName = "Auditor E2E " + Date.now();
    const newUser = await prisma.user.create({
      data: {
        name: newUserName,
        email: `auditor${Date.now()}@test.com`,
        password_hash: "fakehash",
        role_id: role.id,
        company_id: admin.company_id
      }
    });
    assert(newUser.id !== undefined, "Criação de novo usuário persistida corretamente no banco");

    // 2. Connect (Messages)
    console.log("\n--- FASE 4 & 5: CONNECT E MENSAGENS ---");
    const channel = await prisma.chatChannel.create({ data: { name: "Canal Geral Teste", is_group: true } });
    assert(channel.id !== undefined, "Criação de canal no Connect");

    const msg = await prisma.chatMessage.create({
      data: {
        channel_id: channel.id,
        sender_id: admin.id,
        content: "Mensagem de teste E2E com acentuação e caracteres: !@# çãó"
      }
    });
    assert(msg.id !== undefined, "Envio de mensagem persistida corretamente no banco");
    
    const msgCheck = await prisma.chatMessage.findUnique({ where: { id: msg.id }});
    assert(msgCheck.content.includes("çãó"), "Mensagem recuperada com caracteres intactos (UTF-8)");

    // 3. Chamados (Tickets)
    console.log("\n--- FASE 6: CHAMADOS ---");
    const ticketCount = await prisma.ticket.count();
    const ticketCode = `CH-${String(ticketCount + 1).padStart(7, '0')}`;
    const ticket = await prisma.ticket.create({
      data: {
        code: ticketCode,
        title: "Falha de Rede Teste E2E",
        description: "Não consigo acessar a internet.",
        type: "INCIDENT",
        priority: "HIGH",
        requester_id: newUser.id,
        company_id: admin.company_id,
        status: "NEW"
      }
    });
    assert(ticket.id !== undefined, "Criação de chamado pelo usuário");

    // Atender chamado
    const attendedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "IN_PROGRESS", assigned_to_id: admin.id }
    });
    assert(attendedTicket.status === "IN_PROGRESS" && attendedTicket.assigned_to_id === admin.id, "Chamado assumido pelo administrador");

    // Comentar chamado
    const comment = await prisma.ticketComment.create({
      data: {
        ticket_id: ticket.id,
        author_id: admin.id,
        content: "Estamos analisando a falha."
      }
    });
    assert(comment.id !== undefined, "Comentário (resposta) no chamado adicionado");

    // Concluir chamado
    const resolvedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "RESOLVED", resolved_at: new Date() }
    });
    assert(resolvedTicket.resolved_at !== null, "Chamado resolvido e data de resolução gravada");

    // 4. Máquinas (CMDB)
    console.log("\n--- FASE 7: CADASTRO DE MÁQUINAS ---");
    const asset = await prisma.asset.create({
      data: {
        name: "Notebook Dell Latitude E2E",
        internal_id: "PC-E2E-" + Date.now(),
        type: "COMPUTER",
        company_id: admin.company_id,
        status: "ACTIVE"
      }
    });
    assert(asset.id !== undefined, "Ativo (Máquina) cadastrado no banco");

    // Relacionar chamado com máquina
    const assetTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { asset_id: asset.id }
    });
    assert(assetTicket.asset_id === asset.id, "Máquina relacionada com o chamado");

    // Editar máquina
    const updatedAsset = await prisma.asset.update({
      where: { id: asset.id },
      data: { name: "Notebook Dell Latitude E2E - Modificado" }
    });
    assert(updatedAsset.name.includes("Modificado"), "Máquina editada e salva corretamente");

    // 5. General CRUD Check
    console.log("\n--- FASE 9: CRUD COMPLETO ---");
    // Problems
    const prob = await prisma.problem.create({
      data: { title: "E2E Problem", description: "Desc", code: "PB-TEST-" + Date.now(), company_id: admin.company_id }
    });
    assert(prob.id !== undefined, "CREATE Problem funcionou");
    
    // Knowledge
    const ka = await prisma.knowledgeArticle.create({
      data: { title: "Artigo Teste", content: "Conteúdo", company_id: admin.company_id, author_id: admin.id, category: "FAQ" }
    });
    assert(ka.id !== undefined, "CREATE Knowledge funcionou");

  } catch (error) {
    console.error("ERRO CRITICO DURANTE AUDITORIA:", error);
    assert(false, "Falha crítica na auditoria de banco " + error.message);
  }

  console.log("\n==========================================");
  console.log(`RESULTADO: ${passed} Passaram, ${failed} Falharam`);
  console.log("==========================================");
}

runE2EAudit().finally(() => prisma.$disconnect());
