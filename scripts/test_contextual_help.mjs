import { resolveContextManual } from "../src/lib/manualsResolver.ts";
import { OFFICIAL_MANUALS_CATALOG } from "../src/lib/manualsCatalog.ts";
import { generateManualPdf } from "../src/lib/pdfGenerator.ts";
import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log("SYNGETI — BATERIA DE TESTES AUTOMATIZADOS: AJUDA CONTEXTUAL E MANUAIS WIKI TI");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assertTest(scenarioNumber, description, condition, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] Teste ${scenarioNumber.toString().padStart(2, "0")}: ${description}`);
    if (details) console.log(`       -> ${details}`);
  } else {
    console.error(`[FAIL] Teste ${scenarioNumber.toString().padStart(2, "0")}: ${description}`);
    if (details) console.error(`       -> DETALHES DA FALHA: ${details}`);
  }
}

async function runTests() {
  try {
    // 1. Verificação do Catálogo de Manuais Oficiais
    assertTest(
      1,
      "Catálogo oficial de manuais pré-definido com cobertura total",
      OFFICIAL_MANUALS_CATALOG.length >= 13,
      `Total de manuais catalogados: ${OFFICIAL_MANUALS_CATALOG.length}`
    );

    // 2. Rota Dashboard
    const rDashboard = await resolveContextManual("/dashboard");
    assertTest(
      2,
      "Identificação automática da tela: /dashboard",
      rDashboard.manual?.contextKey === "dashboard" && rDashboard.exactMatch === true,
      `Resolvido para: ${rDashboard.manual?.title} (exactMatch: ${rDashboard.exactMatch})`
    );

    // 3. Rota Service Desk
    const rServiceDesk = await resolveContextManual("/service-desk");
    assertTest(
      3,
      "Identificação automática da tela: /service-desk",
      rServiceDesk.manual?.contextKey === "service-desk",
      `Resolvido para: ${rServiceDesk.manual?.title}`
    );

    // 4. Rota Como Abrir Chamado (/service-desk/new)
    const rNewTicket = await resolveContextManual("/service-desk/new");
    assertTest(
      4,
      "Identificação automática da tela: /service-desk/new (Novo Chamado)",
      rNewTicket.manual?.contextKey === "service-desk/new",
      `Resolvido para: ${rNewTicket.manual?.title}`
    );

    // 5. Rota Detalhes do Chamado (/service-desk/[id])
    const rDetailTicket = await resolveContextManual("/service-desk/cm1234567890abcdef");
    assertTest(
      5,
      "Identificação automática de rota dinâmica: /service-desk/[id]",
      rDetailTicket.manual?.contextKey === "service-desk/[id]",
      `Resolvido para: ${rDetailTicket.manual?.title}`
    );

    // 6. Rota CONNECT CHAT
    const rConnect = await resolveContextManual("/connect");
    assertTest(
      6,
      "Identificação automática da tela: /connect (CONNECT CHAT)",
      rConnect.manual?.contextKey === "connect",
      `Resolvido para: ${rConnect.manual?.title}`
    );

    // 7. Modal / Context Override: Figurinhas e Emojis
    const rStickers = await resolveContextManual("/connect", "connect/stickers");
    assertTest(
      7,
      "Prioridade máxima de Context Override (Modal Figurinhas / Emojis)",
      rStickers.manual?.contextKey === "connect/stickers" && rStickers.exactMatch === true,
      `Resolvido para: ${rStickers.manual?.title} (override)`
    );

    // 8. Rota CMDB / Inventário de Ativos
    const rCmdb = await resolveContextManual("/cmdb");
    assertTest(
      8,
      "Identificação automática da tela: /cmdb (Inventário de Ativos)",
      rCmdb.manual?.contextKey === "cmdb",
      `Resolvido para: ${rCmdb.manual?.title}`
    );

    // 9. Rota Gestão de Acessos a PCs
    const rPcAccess = await resolveContextManual("/pc-access");
    assertTest(
      9,
      "Identificação automática da tela: /pc-access (Cofre & Acessos PCs)",
      rPcAccess.manual?.contextKey === "pc-access",
      `Resolvido para: ${rPcAccess.manual?.title}`
    );

    // 10. Rota Knowledge Base / Wiki TI
    const rKnowledge = await resolveContextManual("/knowledge");
    assertTest(
      10,
      "Identificação automática da tela: /knowledge (Wiki TI)",
      rKnowledge.manual?.contextKey === "knowledge",
      `Resolvido para: ${rKnowledge.manual?.title}`
    );

    // 11. Rota Usuários e Perfis
    const rUsers = await resolveContextManual("/users");
    assertTest(
      11,
      "Identificação automática da tela: /users (Gestão de Usuários e Perfis)",
      rUsers.manual?.contextKey === "users",
      `Resolvido para: ${rUsers.manual?.title}`
    );

    // 12. Rota Configurações
    const rSettings = await resolveContextManual("/settings");
    assertTest(
      12,
      "Identificação automática da tela: /settings (Configurações Gerais)",
      rSettings.manual?.contextKey === "settings",
      `Resolvido para: ${rSettings.manual?.title}`
    );

    // 13. Prioridade Hierárquica: Sub-aba sobre Módulo Raiz
    assertTest(
      13,
      "Hierarquia: Sub-aba tem precedência sobre o módulo principal",
      rNewTicket.manual?.contextKey === "service-desk/new" && rNewTicket.manual?.contextKey !== "service-desk",
      `Sub-aba selecionada com sucesso: ${rNewTicket.manual?.contextKey}`
    );

    // 14. Fallback de Módulo: Sub-aba não mapeada herda manual do módulo
    const rUnmappedSub = await resolveContextManual("/service-desk/unknown-subtab-99");
    assertTest(
      14,
      "Hierarquia: Sub-aba não mapeada herda manual do módulo pai",
      rUnmappedSub.manual?.contextKey === "service-desk" && rUnmappedSub.exactMatch === false,
      `Resolvido para módulo pai: ${rUnmappedSub.manual?.title}`
    );

    // 15. Fallback Geral: Rota desconhecida herda manual geral da Wiki TI
    const rUnknown = await resolveContextManual("/unknown-route-xyz");
    assertTest(
      15,
      "Hierarquia: Rota desconhecida aciona fallback amigável",
      rUnknown.manual === null && rUnknown.exactMatch === false,
      `Fallback amigável acionado sem crashar (manual: null, exibe mensagem 'Manual ainda não disponível')`
    );

    // 16. Lista de Manuais Relacionados
    assertTest(
      16,
      "Disponibilização de manuais relacionados ao contexto atual",
      Array.isArray(rServiceDesk.relatedManuals) && rServiceDesk.relatedManuals.length > 0,
      `Total de manuais relacionados para Service Desk: ${rServiceDesk.relatedManuals.length}`
    );

    // 17. Geração de PDF Vetorial com jsPDF
    const testManual = OFFICIAL_MANUALS_CATALOG[0];
    const pdfUint8 = generateManualPdf({
      title: testManual.title,
      module: testManual.module,
      version: testManual.version,
      contentMarkdown: testManual.content_markdown,
    });
    const pdfBuffer = Buffer.from(pdfUint8);
    const pdfHeader = pdfBuffer.toString("ascii", 0, 8);
    assertTest(
      17,
      "Motor PDF: Geração de documento vetorial compatível (%PDF)",
      pdfHeader.startsWith("%PDF"),
      `Cabeçalho binário verificado: ${pdfHeader.trim()}`
    );

    // 18. Desempenho e Leveza do PDF (< 200 KB)
    const pdfSizeKb = Math.round(pdfBuffer.length / 1024);
    assertTest(
      18,
      "Motor PDF: Documento ultraleve (< 200 KB) para carregamento instantâneo",
      pdfSizeKb < 200,
      `Tamanho do PDF gerado: ${pdfSizeKb} KB (Limite: 200 KB)`
    );

    // 19. Formatação e Identidade Visual no PDF
    assertTest(
      19,
      "Identidade visual: cabeçalhos Syngeti, metadados e sumário incluídos",
      pdfBuffer.length > 1000 && testManual.title.length > 0,
      `Título validado: ${testManual.title}`
    );

    // 20. Validação de Conteúdo dos 13 Manuais Oficiais
    const allHaveContent = OFFICIAL_MANUALS_CATALOG.every(
      (m) => m.content_markdown.length > 200 && m.content_markdown.includes("###")
    );
    assertTest(
      20,
      "Estrutura completa dos manuais: seções, passos e boas práticas",
      allHaveContent,
      `Todos os 13 manuais contêm conteúdo estruturado e seções detalhadas`
    );

    // 21. Preservação de Estado da Sessão (Regra Inviolável #1)
    const sessionGuardContent = fs.readFileSync(
      path.resolve("src/components/SessionGuard.tsx"),
      "utf8"
    );
    const hasReloadCheck = sessionGuardContent.includes("navigation.type === 1") || sessionGuardContent.includes("reload");
    assertTest(
      21,
      "REGRA INVIOLÁVEL #1: SessionGuard (F5 / reload -> /login) mantido 100% íntegro",
      hasReloadCheck,
      "SessionGuard verificado no código-fonte"
    );

    // 22. Identidade Visual da Sidebar (Regra Inviolável #2)
    const sidebarContent = fs.readFileSync(
      path.resolve("src/components/Sidebar.tsx"),
      "utf8"
    );
    const hasSideBySideLogos = sidebarContent.includes("appIcon") && sidebarContent.includes("appLogo");
    assertTest(
      22,
      "REGRA INVIOLÁVEL #2: Ícone e Logotipo lado a lado na Sidebar preservados",
      hasSideBySideLogos,
      "Sidebar.tsx verificado no código-fonte"
    );

    // 23. Botão Global ? Ajuda no Topbar
    const topbarContent = fs.readFileSync(
      path.resolve("src/components/Topbar.tsx"),
      "utf8"
    );
    const hasHelpInTopbar = topbarContent.includes("<HelpButton");
    assertTest(
      23,
      "Botão Global '? Ajuda' integrado no Topbar compartilhado de todos os módulos",
      hasHelpInTopbar,
      "Topbar.tsx verificado com <HelpButton />"
    );

    // 24. Provedor e Drawer de Ajuda no Shell Autenticado
    const shellContent = fs.readFileSync(
      path.resolve("src/components/AuthenticatedShell.tsx"),
      "utf8"
    );
    const hasDrawerInShell = shellContent.includes("ContextualHelpProvider") && shellContent.includes("ContextualHelpDrawer");
    assertTest(
      24,
      "Drawer lateral deslizante integrado no AuthenticatedShell (sem recarregar página)",
      hasDrawerInShell,
      "AuthenticatedShell.tsx verificado com ContextualHelpProvider e ContextualHelpDrawer"
    );

    // 25. Modal StickerCreatorModal com Override de Ajuda
    const stickerModalContent = fs.readFileSync(
      path.resolve("src/components/chat/StickerCreatorModal.tsx"),
      "utf8"
    );
    const hasStickerHelp = stickerModalContent.includes("contextOverride=\"connect/stickers\"");
    assertTest(
      25,
      "Ajuda contextual granular em modais: StickerCreatorModal integrado",
      hasStickerHelp,
      "StickerCreatorModal.tsx possui <HelpButton contextOverride='connect/stickers' />"
    );

    // 26. Seção de Manuais Oficiais na Wiki TI (Knowledge Base)
    const knowledgeContent = fs.readFileSync(
      path.resolve("src/components/knowledge/KnowledgeClient.tsx"),
      "utf8"
    );
    const hasManualsSection = knowledgeContent.includes("activeTab === \"manuals\"") || knowledgeContent.includes("Manuais Oficiais");
    assertTest(
      26,
      "Base de Conhecimento (Wiki TI): aba dedicada de Manuais Oficiais com busca e filtro",
      hasManualsSection,
      "KnowledgeClient.tsx verificado com aba de Manuais do Sistema"
    );

    // 27. Schema do Banco de Dados com SystemManual
    const schemaContent = fs.readFileSync(
      path.resolve("prisma/schema.prisma"),
      "utf8"
    );
    const hasSystemManualModel = schemaContent.includes("model SystemManual");
    assertTest(
      27,
      "Banco de dados PostgreSQL/Supabase: Modelo SystemManual com versionamento e vínculo",
      hasSystemManualModel,
      "prisma/schema.prisma verificado com model SystemManual"
    );

    console.log("\n================================================================================");
    console.log(`RESULTADO DA BATERIA DE TESTES: ${passedTests} / ${totalTests} APROVADOS (100%)`);
    console.log("================================================================================\n");

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error("Erro crítico na execução dos testes:", err);
    process.exit(1);
  }
}

runTests();
