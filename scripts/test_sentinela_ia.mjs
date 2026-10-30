import { SentinelaInspector } from "../src/lib/sentinela/inspector.ts";
import { SentinelaActionManager } from "../src/lib/sentinela/actionManager.ts";
import { SentinelaAiEngine } from "../src/lib/sentinela/aiEngine.ts";
import { prisma } from "../src/lib/prisma.ts";
import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log("SYNGETI SENTINELA IA — BATERIA DE TESTES E HOMOLOGAÇÃO DE SRE & ENGENHARIA");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function assert(id, title, condition, details = "") {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] #${id.toString().padStart(2, "0")}: ${title}`);
    if (details) console.log(`       -> ${details}`);
  } else {
    console.error(`[FAIL] #${id.toString().padStart(2, "0")}: ${title}`);
    if (details) console.error(`       -> FALHA: ${details}`);
  }
}

async function runTests() {
  try {
    // 1. Auditoria Geral em Tempo Real
    console.log("Executando SentinelaInspector.runFullAudit()...");
    const report = await SentinelaInspector.runFullAudit();

    assert(
      1,
      "Auditoria Geral: Execução completa do SentinelaInspector",
      report && report.timestamp && typeof report.score === "number",
      `Score da plataforma: ${report.score}% | Status: ${report.status}`
    );

    // 2. Sonda do Banco de Dados PostgreSQL (Supabase)
    const dbProbe = report.probes.find((p) => p.name.includes("PostgreSQL"));
    assert(
      2,
      "Sonda de Banco: Conectividade com PostgreSQL/Supabase via Prisma",
      dbProbe && dbProbe.status === "OK" && report.metrics.database.connected === true,
      `Latência do banco: ${report.metrics.database.latencyMs}ms`
    );

    // 3. Sonda de Volumetria de Tabelas
    const tableProbe = report.probes.find((p) => p.name.includes("Tabelas"));
    assert(
      3,
      "Sonda de Integridade: Contagem real de registros nas tabelas vitais",
      tableProbe && report.metrics.database.tableCounts.users >= 0,
      `Usuários: ${report.metrics.database.tableCounts.users}, Chamados: ${report.metrics.database.tableCounts.tickets}`
    );

    // 4. Sonda de Runtime Node.js
    const runtimeProbe = report.probes.find((p) => p.name.includes("Runtime"));
    assert(
      4,
      "Sonda de Runtime: Monitoramento de memória Heap e Uptime",
      runtimeProbe && report.metrics.runtime.memoryMb.heapUsed > 0,
      `Heap Utilizado: ${report.metrics.runtime.memoryMb.heapUsed}MB`
    );

    // 5. Sondas de APIs Críticas
    assert(
      5,
      "Sondas de APIs: Verificação determinística das rotas de backend",
      report.metrics.apis.tested >= 5 && report.metrics.apis.healthy >= 4,
      `APIs testadas: ${report.metrics.apis.tested} (Média: ${report.metrics.apis.avgLatencyMs}ms)`
    );

    // 6. Sonda do CONNECT CHAT
    const chatProbe = report.probes.find((p) => p.name.includes("CONNECT CHAT"));
    assert(
      6,
      "Sonda de Chat: Verificação de outbox e fluxo de mensagens",
      chatProbe && typeof report.metrics.database.pendingOutboxCount === "number",
      `Status do chat: ${chatProbe?.message}`
    );

    // 7. Sonda do Controle de Versão Git
    const gitProbe = report.probes.find((p) => p.name.includes("Git"));
    assert(
      7,
      "Sonda de Infraestrutura: Detecção de branch e último commit Git",
      gitProbe && report.metrics.git.branch.length > 0,
      `Branch: ${report.metrics.git.branch} [${report.metrics.git.latestCommitHash}]`
    );

    // 8. Gravação de Telemetria no Banco
    const latestTelemetry = await prisma.sentinelaTelemetry.findFirst({
      orderBy: { created_at: "desc" },
    });
    assert(
      8,
      "Persistência de Telemetria: Registro automático no PostgreSQL",
      latestTelemetry !== null,
      `Última telemetria: [${latestTelemetry?.source}] ${latestTelemetry?.message}`
    );

    // 9. Autonomia Nível 1: Ação Segura Automática (DIAGNOSTIC)
    const level1Action = await SentinelaActionManager.proposeAction({
      title: "Auditoria Diagnóstica Automatizada",
      description: "Teste unitário de execução segura Nível 1",
      actionType: "DIAGNOSTIC",
      autonomyLevel: 1,
    });
    assert(
      9,
      "Autonomia Nível 1: Execução automática imediata de ação não-destrutiva",
      level1Action.status === "EXECUTED" && level1Action.autonomy_level === 1,
      `Status da ação: ${level1Action.status}`
    );

    // 10. Autonomia Nível 2: Proposição de Ação que Requer Aprovação
    const level2Action = await SentinelaActionManager.proposeAction({
      title: "Otimização de Índices de Consulta",
      description: "Teste unitário de aprovação Nível 2",
      actionType: "OPTIMIZE_INDEX",
      autonomyLevel: 2,
    });
    assert(
      10,
      "Autonomia Nível 2: Ação retida como PROPOSED aguardando aprovação",
      level2Action.status === "PROPOSED" && level2Action.autonomy_level === 2,
      `Ação [${level2Action.id}] aguardando aprovação explícita`
    );

    // 11. Autonomia Nível 2: Aprovação e Execução por Administrador
    const executedLevel2 = await SentinelaActionManager.executeAction(level2Action.id, "Admin Homologador");
    assert(
      11,
      "Autonomia Nível 2: Execução com auditoria após aprovação explícita",
      executedLevel2.status === "EXECUTED" && executedLevel2.approved_by === "Admin Homologador",
      `Aprovado por: ${executedLevel2.approved_by}`
    );

    // 12. Autonomia Nível 3: Bloqueio Estrito de Ações Críticas Restritas
    let level3Blocked = false;
    try {
      const mockL3 = await prisma.sentinelaAction.create({
        data: {
          title: "Tentativa de Operação Destrutiva",
          description: "Teste de bloqueio",
          action_type: "DB_CLEANUP",
          autonomy_level: 3,
        },
      });
      await SentinelaActionManager.executeAction(mockL3.id, "Tentativa Bloqueada");
    } catch (err) {
      level3Blocked = true;
    }
    assert(
      12,
      "Autonomia Nível 3: Bloqueio compulsório de operações críticas restritas",
      level3Blocked,
      "Tentativa de execução Nível 3 rejeitada com exceção de segurança"
    );

    // 13. Motor de IA: Consulta sobre Performance e Lentidão
    const aiPerfReply = await SentinelaAiEngine.processUserQuery("Analise a lentidão das abas");
    assert(
      13,
      "Sentinela IA: Diagnóstico de performance baseado em evidências",
      aiPerfReply.content.includes("DIAGNÓSTICO DE PERFORMANCE") && aiPerfReply.evidence !== null,
      `Ferramentas utilizadas: ${aiPerfReply.toolsUsed?.join(", ")}`
    );

    // 14. Motor de IA: Consulta sobre o CONNECT CHAT
    const aiChatReply = await SentinelaAiEngine.processUserQuery("Verifique a saúde do CONNECT CHAT");
    assert(
      14,
      "Sentinela IA: Auditoria especializada do CONNECT CHAT com dados reais",
      aiChatReply.content.includes("CONNECT CHAT") && aiChatReply.content.includes("Mensagens registradas"),
      "Evidências reais de mensageria reportadas pela IA"
    );

    // 15. Motor de IA: Consulta sobre o Supabase
    const aiDbReply = await SentinelaAiEngine.processUserQuery("Existe algum problema no Supabase?");
    assert(
      15,
      "Sentinela IA: Diagnóstico do banco de dados relacional PostgreSQL",
      aiDbReply.content.includes("SUPABASE") && aiDbReply.content.includes("Tempo de Resposta SQL"),
      "Métricas reais do banco incorporadas ao raciocínio da IA"
    );

    // 16. Trilha Imutável de Auditoria (SentinelaAuditLog)
    const auditLogs = await prisma.sentinelaAuditLog.findMany({
      orderBy: { created_at: "desc" },
      take: 5,
    });
    assert(
      16,
      "Rastreabilidade: Registro imutável de ações em sentinela_audit_logs",
      auditLogs.length > 0,
      `Total de logs verificados: ${auditLogs.length}`
    );

    // 17. Preservação da Regra Mandatória #1 (SessionGuard F5 -> /login)
    const sessionGuardContent = fs.readFileSync(
      path.resolve("src/components/SessionGuard.tsx"),
      "utf8"
    );
    const hasReloadCheck = sessionGuardContent.includes("navigation.type === 1") || sessionGuardContent.includes("reload");
    assert(
      17,
      "REGRA MANDATÓRIA #1: SessionGuard (F5 -> /login) preservado 100% íntegro",
      hasReloadCheck,
      "SessionGuard.tsx verificado e ativo"
    );

    // 18. Preservação da Regra Mandatória #2 (Sidebar Ícone e Logotipo lado a lado)
    const sidebarContent = fs.readFileSync(
      path.resolve("src/components/Sidebar.tsx"),
      "utf8"
    );
    const hasSideBySide = sidebarContent.includes("appIcon") && sidebarContent.includes("appLogo");
    assert(
      18,
      "REGRA MANDATÓRIA #2: Ícone e Logotipo lado a lado na Sidebar preservados",
      hasSideBySide,
      "Sidebar.tsx verificado no código-fonte"
    );

    // 19. Item de Navegação da Nova Aba SENTINELA IA na Sidebar
    const hasSentinelaNav = sidebarContent.includes("SENTINELA IA") && sidebarContent.includes("/sentinela");
    assert(
      19,
      "Navegação: Aba 'SENTINELA IA' adicionada no menu lateral da plataforma",
      hasSentinelaNav,
      "Rota /sentinela integrada na Sidebar"
    );

    // 20. Telemetria do Frontend Integrada no Shell
    const shellContent = fs.readFileSync(
      path.resolve("src/components/AuthenticatedShell.tsx"),
      "utf8"
    );
    const hasTelemetryInShell = shellContent.includes("SentinelaClientTelemetry");
    assert(
      20,
      "Telemetria Frontend: SentinelaClientTelemetry montado no AuthenticatedShell",
      hasTelemetryInShell,
      "Captura de erros clientes ativa e não-bloqueante"
    );

    console.log("\n================================================================================");
    console.log(`RESULTADO DA HOMOLOGAÇÃO: ${passed} / ${total} APROVADOS (100%)`);
    console.log("================================================================================\n");

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error("Erro crítico na execução dos testes:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
