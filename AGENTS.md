<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MEMÓRIA PERMANENTE DO PROJETO SYNGETI (REGRAS MANDATÓRIAS DO USUÁRIO)

## 1. Segurança e Comportamento de Sessão (F5 / Atualizar Página / Fechar Navegador)
- **REGRA INVIOLÁVEL:** Sempre que o usuário der um F5, atualizar a página no navegador ou fechar o navegador, a sessão deve ser encerrada imediatamente e o usuário deve retornar para a tela de login (`/login`).
- **NÃO MODIFICAR / NÃO TRATAR COMO BUG:** Esse comportamento foi expressamente ordenado pelo usuário por requisitos corporativos e industriais de segurança estrita.
- A navegação autenticada no sistema é realizada de forma contínua via SPA (Single Page Application). Qualquer recarregamento de página completo (reload/F5) ou fechamento de navegador/aba invalida a sessão e redireciona para `/login`.

## 2. Identidade Visual da Barra Lateral (Canto Superior Esquerdo)
- No cabeçalho da barra lateral (`Sidebar.tsx`), o **Ícone** (`appIcon`) e o **Logotipo** (`appLogo`) são **elementos separados e dispostos lado a lado horizontalmente**.
- No modo compacto/recolhido da barra lateral, deve ser exibido **exclusivamente o ícone**, centralizado.
- O logotipo empilhado vertical com fundo (`logo-hq-transparent.png`) pertence exclusivamente à tela de login (`/login`).

