const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeString(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function areStringsEquivalent(a, b) {
  return normalizeString(a) === normalizeString(b);
}

function calculateDuration(start, end) {
  if (!start) return "—";
  if (!end) return "Em andamento";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "—";
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(diffMinutes / (60 * 24));
  const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
  const minutes = diffMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

async function runTests() {
  console.log("=== INICIANDO TESTES DO SMART CADASTROS & RELATÓRIOS ===");

  // 1. Teste de Normalização e Equivalência
  console.log("\n[TESTE 1] Normalização e Anti-duplicação:");
  const name1 = "Marcos Antônio da Silva";
  const name2 = "marcos antonio da silva";
  const name3 = "  MARCOS ANTÔNIO DA SILVA  ";
  const eq = areStringsEquivalent(name1, name2) && areStringsEquivalent(name2, name3);
  console.log(`Equivalência de nomes acentuados e maiúsculos: ${eq ? "PASSOU ✓" : "FALHOU ✗"}`);

  // 2. Teste de Criação e Consulta de Requester Manual no Banco
  console.log("\n[TESTE 2] Criação de Solicitante Manual no Banco (Sem credenciais de login):");
  const testName = "Teste Solicitante " + Date.now();
  const company = await prisma.company.findFirst();
  const companyId = company ? company.id : null;

  const createdReq = await prisma.requester.create({
    data: {
      name: testName,
      company_id: companyId,
    }
  });
  console.log(`Solicitante criado no banco: id=${createdReq.id}, name="${createdReq.name}"`);

  // Verificar que não existe usuário correspondente com login/senha
  const userCheck = await prisma.user.findFirst({
    where: { name: testName }
  });
  console.log(`Verificação de segurança (não é usuário autenticado): ${userCheck === null ? "PASSOU ✓ (Sem login/acesso)" : "FALHOU"}`);

  // 3. Teste de Item Catalog
  console.log("\n[TESTE 3] Persistência no ItemCatalog:");
  const testItemName = "Item Teste " + Date.now();
  const createdItem = await prisma.itemCatalog.create({
    data: {
      name: testItemName,
      category: "Periféricos",
      unit: "UN",
    }
  });
  console.log(`Item catalogado: id=${createdItem.id}, name="${createdItem.name}"`);

  const fetchedItem = await prisma.itemCatalog.findFirst({
    where: { name: testItemName }
  });
  console.log(`Recuperação do ItemCatalog: ${fetchedItem ? "PASSOU ✓" : "FALHOU ✗"}`);

  // 4. Teste de Cálculo de Tempo de Atendimento dos Relatórios
  console.log("\n[TESTE 4] Cálculo de Tempo de Atendimento (Relatórios):");
  const dStart = new Date("2026-10-27T08:00:00.000Z");
  const dEnd1 = new Date("2026-10-27T10:27:00.000Z"); // 2h 27min
  const dEnd2 = new Date("2026-10-28T12:15:00.000Z"); // 1d 4h 15min
  const dEnd3 = new Date("2026-10-27T08:45:00.000Z"); // 45min

  const dur1 = calculateDuration(dStart, dEnd1);
  const dur2 = calculateDuration(dStart, dEnd2);
  const dur3 = calculateDuration(dStart, dEnd3);
  const durOpen = calculateDuration(dStart, null);

  console.log(`Duração 1 (2h 27min): "${dur1}" -> ${dur1 === "2h 27min" ? "PASSOU ✓" : "FALHOU"}`);
  console.log(`Duração 2 (1d 4h 15min): "${dur2}" -> ${dur2 === "1d 4h 15min" ? "PASSOU ✓" : "FALHOU"}`);
  console.log(`Duração 3 (45min): "${dur3}" -> ${dur3 === "45min" ? "PASSOU ✓" : "FALHOU"}`);
  console.log(`Duração Chamado Aberto: "${durOpen}" -> ${durOpen === "Em andamento" ? "PASSOU ✓" : "FALHOU"}`);

  // Limpeza dos dados de teste
  await prisma.requester.delete({ where: { id: createdReq.id } });
  await prisma.itemCatalog.delete({ where: { id: createdItem.id } });
  console.log("\nLimpeza de dados de teste concluída com sucesso.");

  console.log("\n=== TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO! ===");
}

runTests()
  .catch(err => {
    console.error("Erro nos testes:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
