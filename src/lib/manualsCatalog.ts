/**
 * Catálogo Canônico dos Manuais Oficiais do SYNGETI
 * Baseado nas funcionalidades reais e verificadas de cada módulo e subaba.
 */

export interface SystemManualSeed {
  module: string;
  submodule: string | null;
  context_key: string;
  route_pattern: string;
  title: string;
  description: string;
  version: string;
  status: string;
  tags: string;
  order_index: number;
  content_markdown: string;
}

export const OFFICIAL_MANUALS_CATALOG: SystemManualSeed[] = [
  {
    module: "dashboard",
    submodule: null,
    context_key: "dashboard",
    route_pattern: "/dashboard",
    title: "Manual — Painel Geral e Indicadores (Dashboard)",
    description: "Visão geral da operação de TI, relógio oficial em horário de Brasília, indicadores em tempo real e atalhos rápidos.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "dashboard, painel, indicadores, chamados, kpi, relógio",
    order_index: 1,
    content_markdown: `# MANUAL OFICIAL — PAINEL GERAL (DASHBOARD)
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Módulo de Gestão (Dashboard)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Orientar os gestores e analistas de TI sobre o monitoramento dos principais indicadores operacionais (KPIs), chamados recentes e inventário ativo da organização.

### 2. QUEM PODE UTILIZAR
- Todos os usuários autenticados com perfil Administrador, Técnico ou Gestor.

### 3. ONDE ENCONTRAR
- Barra Lateral → **Painel Geral** (\`/dashboard\`).

### 4. PRINCIPAIS RECURSOS
1. **Saudação e Relógio Oficial:** Exibe o nome do usuário e o relógio em tempo real sincronizado no fuso horário oficial de Brasília (\`America/Sao_Paulo\`).
2. **Cards de Indicadores (KPIs):**
   - **Chamados Abertos:** Total de chamados com status Novo ou Aberto.
   - **Em Atendimento:** Chamados sob triagem técnica ativa.
   - **Chamados Resolvidos:** Total de atendimentos concluídos e indicador de resoluções de hoje.
   - **Equipamentos Ativos:** Total de computadores e periféricos em uso no inventário CMDB.
3. **Gráfico de Chamados por Categoria:** Distribuição visual para identificação de gargalos.
4. **Últimos Chamados:** Acesso rápido com clique direto para visualização do chamado.
5. **Equipamentos Recentes:** Lista das últimas máquinas cadastradas no parque tecnológico.
`
  },
  {
    module: "service-desk",
    submodule: null,
    context_key: "service-desk",
    route_pattern: "/service-desk",
    title: "Manual — Service Desk e Gestão de Chamados",
    description: "Guia completo de listagem, pesquisa, filtros por período e status, atribuição e exportação de chamados.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "service desk, chamados, suporte, incidentes, requisições, filtros, exportar",
    order_index: 2,
    content_markdown: `# MANUAL OFICIAL — SERVICE DESK / CHAMADOS
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Módulo de Atendimento → Service Desk (\`/service-desk\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Capacitar analistas e administradores a gerenciar o ciclo de vida completo de chamados de TI, desde a triagem até o encerramento.

### 2. PRINCIPAIS FUNCIONALIDADES
1. **Barra de Busca e Filtros Inteligentes:**
   - Filtro por Ano, Mês e Período (Hoje, Ontem, 7 dias, 15 dias, 30 dias ou Personalizado).
   - Filtro por Status (Novo, Em Atendimento, Pendente, Resolvido, Encerrado).
   - Filtro por Prioridade (Baixa, Média, Alta, Crítica).
2. **Atribuição Rápida:** Botão "+ Assumir" para vincular o chamado instantaneamente ao técnico logado.
3. **Exportação de Relatórios:**
   - Botão **Exportar** com geração de relatórios estruturados em Excel (XLSX), PDF formatado e CSV.
4. **Cálculo de SLA em Horário de Brasília:** Indicadores visuais de SLA Dentro do Prazo ou SLA Excedido.
`
  },
  {
    module: "service-desk",
    submodule: "new",
    context_key: "service-desk/new",
    route_pattern: "/service-desk/new",
    title: "Manual — Como Abrir um Novo Chamado",
    description: "Instruções passo a passo para abertura de incidentes ou requisições de serviço de TI.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "abrir chamado, novo chamado, incidente, requisição, solicitante, urgência",
    order_index: 3,
    content_markdown: `# MANUAL OFICIAL — COMO ABRIR UM CHAMADO
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Service Desk → Novo Chamado (\`/service-desk/new\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Instruir sobre o preenchimento correto dos dados para abertura de incidentes (falhas) ou requisições de serviço.

### 2. PASSO A PASSO
1. Acesse **Service Desk** e clique no botão **+ Novo Chamado**.
2. **Tipo de Chamado:**
   - **Incidente:** Interrupção não planejada ou redução da qualidade de um serviço de TI.
   - **Requisição:** Solicitação de novo acesso, equipamento, instalação de software ou serviço padrão.
3. **Solicitante:** Selecione o colaborador que está demandando o atendimento.
4. **Título do Chamado:** Digite um resumo claro do problema ou pedido.
5. **Descrição Detalhada:** Informe os detalhes do ocorrido, mensagens de erro e computadores envolvidos.
6. **Urgência e Impacto:** Defina os níveis para que o sistema calcule a prioridade ITIL automaticamente.
7. Clique em **Salvar Chamado**. O sistema gerará o código (ex: \`CH-00001245\`).
`
  },
  {
    module: "service-desk",
    submodule: "detail",
    context_key: "service-desk/[id]",
    route_pattern: "/service-desk/[id]",
    title: "Manual — Atendimento, Timeline e Resolução de Chamado",
    description: "Como adicionar interações, notas internas confidenciais, alterar status e resolver o chamado.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "atendimento, chamado, notas internas, timeline, resolver, encerrar, sla",
    order_index: 4,
    content_markdown: `# MANUAL OFICIAL — ATENDIMENTO E RESOLUÇÃO DE CHAMADO
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Service Desk → Detalhes do Chamado (\`/service-desk/[id]\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Acompanhar a jornada do chamado, registrar notas públicas ou notas internas confidenciais de TI e formalizar a solução técnica.

### 2. FLUXO DE ATENDIMENTO
1. **Jornada ITIL (Stepper de Status):** Clique nos círculos de status (Novo → Em Atendimento → Pendente Usuário → Resolvido → Encerrado).
2. **Notas Internas de TI:** Marque a opção "Nota Interna" ao comentar para que o solicitante comum não visualize o diagnóstico técnico confidencial.
3. **Resolução:** Ao concluir, clique em **Resolver Chamado**. A data de resolução será gravada no fuso de Brasília.
4. **Impressão:** Botão de impressora para gerar comprovante formal de atendimento.
`
  },
  {
    module: "connect",
    submodule: null,
    context_key: "connect",
    route_pattern: "/connect",
    title: "Manual — CONNECT CHAT (Comunicação Corporativa)",
    description: "Mensageria em tempo real, canais e grupos de equipe, conversas diretas, confirmações de entrega/leitura e chamadas.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "connect chat, chat, mensagens, canais, grupos, tempo real, websocket",
    order_index: 5,
    content_markdown: `# MANUAL OFICIAL — CONNECT CHAT
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** CONNECT CHAT (\`/connect\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Proporcionar comunicação corporativa segura e instantânea entre todos os colaboradores e departamentos da organização.

### 2. RECURSOS PRINCIPAIS
1. **Canais e Grupos:** Canais públicos (ex: \`# Geral\`) e grupos privativos criados por departamento ou projeto.
2. **Mensagens Diretas (1:1):** Converse individualmente com qualquer colaborador cadastrado com indicador de status Online/Offline.
3. **Confirmações Reais de Mensagem:**
   - **Enviando (Spinner):** Em transmissão.
   - **✓ Enviada:** Gravada com segurança no servidor.
   - **✓✓ Entregue:** Recebida no dispositivo do destinatário.
   - **✓✓ Azul (Lida):** Visualizada pelo destinatário.
4. **Chamadas de Áudio e Vídeo:** Comunicação P2P rápida via WebRTC integrada diretamente no chat.
`
  },
  {
    module: "connect",
    submodule: "stickers",
    context_key: "connect/stickers",
    route_pattern: "/connect",
    title: "Manual — Como Criar e Enviar Figurinhas e Emojis no Chat",
    description: "Criação de figurinhas personalizadas com WebP leve, memes com textos, favoritamento de imagens e biblioteca com 10 categorias de emojis.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "figurinhas, stickers, emojis, reações, memes, webp, chat",
    order_index: 6,
    content_markdown: `# MANUAL OFICIAL — FIGURINHAS E EMOJIS NO CONNECT CHAT
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** CONNECT CHAT → Figurinhas e Emojis  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Instruir sobre o envio de reações rápidas, criação de figurinhas corporativas leves e utilização da biblioteca completa de emojis Unicode.

### 2. CRIADOR DE FIGURINHAS
1. Na barra de digitação do chat, clique no ícone de **Rosto Sorridente (Smile)**.
2. Selecione a aba **Figurinhas** e clique no botão **+ Criar Figurinha**.
3. Selecione uma imagem (PNG, JPG, WebP ou GIF de até 5 MB).
4. Escolha o formato de corte: **Quadrado** com cantos arredondados ou **Circular**.
5. Digite o Texto Superior e Inferior e escolha a cor das letras.
6. Clique em **Salvar Figurinha**. O sistema otimiza a imagem em formato WebP ultraleve (20–35 KB).
7. Clique sobre a figurinha para enviá-la instantaneamente na conversa.

### 3. FAVORITAR FIGURINHAS
- Ao passar o mouse sobre qualquer imagem ou figurinha recebida no chat, clique no botão **Favoritar** (estrela) para guardá-la em sua coleção pessoal.
`
  },
  {
    module: "cmdb",
    submodule: null,
    context_key: "cmdb",
    route_pattern: "/cmdb",
    title: "Manual — Inventário de Ativos de TI (CMDB)",
    description: "Cadastro e rastreamento de computadores, servidores, switches, licenças de software e periféricos.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "cmdb, inventario, ativos, computadores, patrimonio, hardware, licenças",
    order_index: 7,
    content_markdown: `# MANUAL OFICIAL — INVENTÁRIO DE ATIVOS (CMDB)
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Inventário de TI / CMDB (\`/cmdb\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Centralizar o controle patrimonial de hardware, software, licenças e equipamentos de rede da infraestrutura de tecnologia.

### 2. PRINCIPAIS RECURSOS
1. **Cadastro de Ativos:** Registro com número de patrimônio (Asset Tag), código interno, fabricante, modelo e número de série.
2. **Ciclo de Vida do Ativo:** Status de controle (Em Uso, Em Manutenção, Em Estoque, Descartado).
3. **Vínculo com Departamentos:** Alocação clara do equipamento a um setor e unidade física da empresa.
4. **Histórico de Chamados:** Rastreamento de todos os atendimentos técnicos que envolveram o equipamento.
`
  },
  {
    module: "pc-access",
    submodule: null,
    context_key: "pc-access",
    route_pattern: "/pc-access",
    title: "Manual — Gestão de Acessos a PCs e Cofre Seguro",
    description: "Gerenciamento de computadores, vínculos de colaboradores, contas locais/domínio, e-mails corporativos e cofre de senhas AES-256.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "pc access, computadores, cofre, senhas, colaboradores, mfa, auditoria, aes-256",
    order_index: 8,
    content_markdown: `# MANUAL OFICIAL — GESTÃO DE ACESSOS A COMPUTADORES (PCs) E COFRE SEGURO
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Gestão de Acessos a PCs (\`/pc-access\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Controlar rigorosamente quem utiliza cada computador da empresa, quais contas Windows/domínio estão ativas e custodiar senhas críticas no cofre criptografado com AES-256-GCM.

### 2. PRINCIPAIS RECURSOS
1. **Painel de Controle:** Métricas de computadores em conformidade, contas com senha custodiada e trilha de auditoria.
2. **Gaveta de Detalhes do PC:**
   - **Visão Geral:** Hostname, sistema operacional, IP, MAC e fabricante.
   - **Colaboradores Vinculados:** Histórico de quem usou o computador e definição do titular principal.
   - **Contas de Acesso:** Contas Locais, Administrador Local ou Domínio com botão **Revelar Senha** protegido por senha do técnico.
   - **E-mails Corporativos:** Contas Microsoft 365, Google Workspace com status de ativação e controle de MFA.
   - **Trilha de Auditoria:** Registro permanente de quem revelou senhas, editou vínculos ou exportou relatórios.
`
  },
  {
    module: "knowledge",
    submodule: null,
    context_key: "knowledge",
    route_pattern: "/knowledge",
    title: "Manual — Base de Conhecimento e Central de Manuais (Wiki TI)",
    description: "Consulta de tutoriais, políticas, procedimentos operacionais padrão (POPs) e manuais oficiais do Syngeti.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "knowledge, wiki, base de conhecimento, manuais, procedimentos, pop, tutoriais",
    order_index: 9,
    content_markdown: `# MANUAL OFICIAL — BASE DE CONHECIMENTO (WIKI TI)
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Base de Conhecimento → Wiki TI (\`/knowledge\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Disponibilizar a documentação institucional e a Central de Manuais em PDF para capacitação contínua dos colaboradores.

### 2. PRINCIPAIS FUNCIONALIDADES
1. **Central de Manuais Oficiais:** Navegação por módulo e subaba, com download e visualização integrada em PDF leve.
2. **Artigos da Wiki TI:** Tutoriais técnicos, políticas de segurança da informação e soluções de problemas conhecidos (FAQ).
3. **Pesquisa Instantânea:** Localize procedimentos digitando palavras-chave ou códigos de erro.
4. **Ajuda Contextual Global:** O botão **? Ajuda** presente no topo de qualquer tela do Syngeti abre diretamente o manual da funcionalidade em uso.
`
  },
  {
    module: "users",
    submodule: null,
    context_key: "users",
    route_pattern: "/users",
    title: "Manual — Gestão de Usuários e Perfis de Acesso",
    description: "Cadastro de colaboradores, controle de logins, associação a setores e configuração de perfis de permissão.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "usuarios, perfis, permissoes, acessos, colaboradores, senhas, login",
    order_index: 10,
    content_markdown: `# MANUAL OFICIAL — GESTÃO DE USUÁRIOS E PERFIS
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Módulo de Cadastros → Usuários (\`/users\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Cadastrar novos colaboradores no Syngeti, configurar credenciais seguras e gerenciar as permissões de acesso aos módulos.

### 2. BOAS PRÁTICAS
1. **Cadastro Completo:** Sempre informe o nome, e-mail corporativo (\`@dlamb.ind.br\` ou \`@eko21.ind.br\`), cargo e departamento.
2. **Perfis de Acesso:** Associe o usuário ao perfil adequado (Administrador, Técnico, Usuário Solicitante).
3. **Navegação Segura:** As ações de personalização de perfis são integradas na aplicação sem interrupção de sessão.
`
  },
  {
    module: "settings",
    submodule: null,
    context_key: "settings",
    route_pattern: "/settings",
    title: "Manual — Configurações Gerais e Personalização",
    description: "Configurações institucionais de logotipo, departamentos, políticas de senhas e vinculação de manuais.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "configuracoes, settings, departamentos, branding, logotipo, administracao",
    order_index: 11,
    content_markdown: `# MANUAL OFICIAL — CONFIGURAÇÕES DO SISTEMA
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Módulo de Configurações (\`/settings\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Permitir aos SuperAdmins configurar parâmetros globais, identidade visual da empresa e departamentos.

### 2. SUBMÓDULOS DE CONFIGURAÇÃO
1. **Identidade Visual (Branding):** Configuração de logotipos, ícone do sistema e nome da empresa.
2. **Departamentos:** Cadastro de setores e centros de custo para direcionamento correto de chamados.
3. **Redefinições de Senha:** Painel administrativo de solicitações de recuperação de acesso com protocolos auditáveis.
4. **Vinculação de Manuais:** Gestão dinâmica de quais manuais PDF são exibidos pelo botão de Ajuda em cada tela.
`
  },
  {
    module: "bookings",
    submodule: null,
    context_key: "bookings",
    route_pattern: "/bookings",
    title: "Manual — Reserva de Recursos e Salas",
    description: "Agendamento e alocação de recursos corporativos, salas de reunião, veículos e projetores.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "reservas, bookings, salas, recursos, agenda, agendamento",
    order_index: 12,
    content_markdown: `# MANUAL OFICIAL — RESERVAS DE RECURSOS E SALAS
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Módulo de Reservas (\`/bookings\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Evitar conflitos de agenda na utilização de salas de videoconferência, projetores e recursos compartilhados.

### 2. COMO RESERVAR
1. Acesse **Reservas** e clique em **+ Nova Reserva**.
2. Selecione o Ativo (Sala ou Equipamento) desejado.
3. Escolha o horário de início e fim no fuso de Brasília.
4. Descreva a finalidade da reserva e confirme.
`
  },
  {
    module: "contracts",
    submodule: null,
    context_key: "contracts",
    route_pattern: "/contracts",
    title: "Manual — Gestão de Contratos e Fornecedores",
    description: "Controle de contratos com fornecedores de TI, links de internet, licenças e alertas de renovação.",
    version: "1.0",
    status: "PUBLISHED",
    tags: "contratos, fornecedores, licenças, renovação, alertas, financeiro",
    order_index: 13,
    content_markdown: `# MANUAL OFICIAL — CONTRATOS E FORNECEDORES
**Sistema:** SYNGETI • Gestão Integrada de TI  
**Módulo:** Módulo de Contratos (\`/contracts\`)  
**Versão:** 1.0 | **Atualização:** Outubro/2026

---

### 1. OBJETIVO
Gerenciar os prazos de validade e termos contratuais com fornecedores de software, telecomunicações e serviços terceirizados.

### 2. PRINCIPAIS RECURSOS
1. **Controle de Vencimentos:** Alertas destacados em vermelho quando um contrato está próximo do prazo limite de renovação.
2. **Gestão de Fornecedores:** Dados de contato, suporte técnico e canais de acionamento de cada parceiro.
`
  }
];
