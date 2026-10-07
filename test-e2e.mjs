import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function fetchAPI(path, method, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runE2E() {
  console.log("🚀 Iniciando Teste E2E Final Automatizado...\n");

  try {
    // 1. Simular Funcionário criando chamado pelo Chat
    console.log("⏳ 1. Funcionário solicitando criação de chamado via Connect...");
    const createRes = await fetchAPI('/api/tickets', 'POST', {
      title: "Falha geral de rede (Teste E2E Automatizado)",
      description: "Histórico da conversa:\n[João]: A rede caiu\n[TI]: Vou abrir um chamado.",
      priority: "ALTA"
    });
    
    if (createRes.status !== 200 || !createRes.data.ticketId) {
      throw new Error(`Falha ao criar chamado: ${JSON.stringify(createRes)}`);
    }
    const ticketId = createRes.data.ticketId;
    console.log(`✅ Sucesso! Chamado gerado: ${ticketId}\n`);

    // 2. Simular TI assumindo e comentando
    console.log(`⏳ 2. TI abrindo chamado ${ticketId} e alterando status para Em Atendimento...`);
    const update1Res = await fetchAPI(`/api/tickets/${ticketId}`, 'POST', {
      content: "Recebido. Nossa equipe já está investigando o switch principal.",
      status: "IN_PROGRESS"
    });
    
    if (update1Res.status !== 200) {
      throw new Error(`Falha ao atualizar chamado: ${JSON.stringify(update1Res)}`);
    }
    console.log("✅ Sucesso! Chamado atualizado com comentário.\n");

    // 3. Simular TI resolvendo o chamado
    console.log(`⏳ 3. TI resolvendo o chamado ${ticketId}...`);
    const update2Res = await fetchAPI(`/api/tickets/${ticketId}`, 'POST', {
      content: "O cabo de fibra do rack 02 foi substituído. Rede estabilizada. Encerrando chamado.",
      status: "RESOLVED"
    });
    
    if (update2Res.status !== 200) {
      throw new Error(`Falha ao resolver chamado: ${JSON.stringify(update2Res)}`);
    }
    console.log("✅ Sucesso! Chamado marcado como RESOLVIDO.\n");

    console.log("🎉 Teste E2E Concluído com 100% de Sucesso na API do Service Desk!");
  } catch (error) {
    console.error("❌ ERRO NO TESTE E2E:", error.message);
  }
}

runE2E();
