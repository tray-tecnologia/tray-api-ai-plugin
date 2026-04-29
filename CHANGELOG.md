# Changelog

## [1.2.0] - 2026-04-29

### Adicionado

- `skills/visao-geral/SKILL.md` — skill de entrada com regras invariantes da API Tray (OAuth, payload com chave do recurso, rate limit, dados BR), carregada antes da skill do recurso para reforçar guardrails em todas as plataformas suportadas
- Seção `## Antes de responder` em todos os 35 `SKILL.md`, com 4 ou 5 passos de verificação (método/endpoint, campos obrigatórios, sem credenciais literais, skill correta e — quando aplicável — execução de `validate.mjs`)
- `skills/{autorizacao,produtos,pedidos,clientes,webhooks}/scripts/validate.mjs` — validadores executáveis de payload por schema, com até 3 tentativas de correção antes de devolver código ao usuário
- `scripts/test-prompt-matcher.mjs` — regressão do `matcher` do hook `UserPromptSubmit` contra os prompts dos Blocos 1, 4, 5 e 6 do `docs/CENARIOS-DE-TESTE.md`, garantindo cobertura PT-BR e ausência de falso-positivo
- `.github/workflows/ci.yml` — pipeline de CI no GitHub Actions rodando `npm run smoke` e `npm run version:check` em PRs e push para `main` (matriz Node 20 e 22)
- `SECURITY.md` — política de divulgação responsável de vulnerabilidades, com canais privados (GitHub Private Vulnerability Reporting + e-mail), SLA de primeiro contato e escopo cobrindo hooks, scripts executáveis, manifests e conteúdo de prompt
- `CONTRIBUTING.md` — guia de contribuição com fluxo de PR, regras de versão, validação local (smoke + version:check) e Conventional Commits
- `package.json` na raiz para distribuição como pacote Node instalável
- `.cursor-plugin/plugin.json` para manifesto nativo de distribuição no Cursor
- `.codex-plugin/plugin.json` para manifesto nativo de distribuição no Codex
- `gemini-extension.json` para extensão nativa no Gemini CLI
- `scripts/sync-version.js` para sincronizar e validar versão entre todos os manifests

### Alterado

- `hooks/hooks.json` — `matcher` do `UserPromptSubmit` reescrito para cobrir vocabulário PT-BR realista. O matcher antigo (`api.*tray|tray.*api|access_token|...`) só disparava com termos técnicos em inglês e não casava com prompts naturais como *"liste os produtos da minha loja Tray"*. O novo matcher usa classes de caracteres (`[Tt]ray`, `[Aa][Pp][Ii]`) e word boundaries para casar com **"loja Tray"**, **"API Tray"**, **"webhooks da Tray"**, **"produtos/pedidos/clientes da/na Tray"**, **"da minha Tray"**, etc., sem disparar em falsos positivos como **"bandeja (tray) de comida"** ou **"lib de UI chamada Tray"**. Validado contra os 18 cenários relevantes em `docs/CENARIOS-DE-TESTE.md` via `scripts/test-prompt-matcher.mjs`
- `hooks/hooks.json` — prompt do `PostToolUse` (matcher `Write|Edit`) reforçado para evitar falso-positivo em arquivos de template e documentação. Agora o hook ignora explicitamente `.env.example`, `.env.template`, `*.example`, `*.template`, `*.sample`, `*.md`, `*.yml`, `*.json` (configs) e similares; em arquivos de código, o gatilho do check de credencial hardcoded passou a ser o **valor** da string (≥20 caracteres alfanuméricos sem espaços), nunca o **nome** da variável, ignorando placeholders óbvios (`sua_*_aqui`, `<...>`, `{{...}}`, `xxx`, `CHANGE_ME`). Resolve o caso reportado em testes externos do plugin onde criar `.env.example` com placeholders disparava `PostToolUse:Write hook stopped continuation`
- `scripts/smoke-test.js` — adicionada seção 10 que executa `test-prompt-matcher.mjs` como regressão de CI; valida também os novos manifests de distribuição
- Contagem de skills atualizada para **35** em `README.md`, `AGENTS.md`, `.github/copilot-instructions.md` e `.claude-plugin/marketplace.json`
- `GEMINI.md`, `.aiassistant/rules/tray-api.md` e `.cursor/rules/tray-api.mdc` listam a nova skill `visao-geral` como entrypoint, carregada antes das skills de recurso
- `README.md` agora referencia `SECURITY.md` e `CONTRIBUTING.md` na introdução, e descreve fluxo de instalação via `npm`/`pnpm`/`bun` e instruções por ferramenta usando `node_modules`
- `package.json` com scripts `version:check` e `version:set`

---

## [1.1.0] - 2026-04-23

### Adicionado

#### Suporte nativo a múltiplas ferramentas de IA

- `AGENTS.md` — carregado automaticamente por Cursor, OpenAI Codex, Windsurf e JetBrains AI; índice completo de skills e agentes com regras da API Tray
- `GEMINI.md` — carregado automaticamente pelo Gemini CLI; importa os skills principais via `@` e lista os demais
- `.cursor/rules/tray-api.mdc` — regra Cursor com frontmatter (`description`, `alwaysApply`) e referências `@` a todos os 34 skills e agentes
- `.github/copilot-instructions.md` — instrução de repositório para GitHub Copilot (VS Code)
- `.aiassistant/rules/tray-api.md` — project rule para JetBrains AI Assistant

#### Skills (34 — campo `when_to_use` adicionado a todos)

Todos os 34 skills agora possuem o campo `when_to_use` no frontmatter, garantindo
descoberta automática confiável em Codex e Gemini CLI.

### Alterado

- `README.md` — nova seção "Instalação por ferramenta" cobrindo todas as 7 ferramentas suportadas

---

## [1.0.0] - 2026-03-21

### Adicionado

#### Skills (34)
- **autorizacao** — Fluxo OAuth 2.0 completo, tokens, renovação, erros
- **webhooks** — Sistema de notificação com 9 escopos
- **produtos** — CRUD completo com todos os campos, filtros, paginação
- **variacoes** — Gestão de variantes (SKUs)
- **imagens-produtos** — Upload de imagens para produtos e variações
- **categorias** — Árvore de categorias e gestão hierárquica
- **pedidos** — Ciclo completo de pedidos
- **clientes** — Gestão de clientes com CPF/CNPJ
- **informacoes-loja** — Dados e configurações da loja
- **caracteristicas** — Atributos customizados de produtos
- **marcas** — Gestão de marcas/fabricantes
- **kits** — Produtos compostos (combos)
- **status-pedido** — Tipos de status de pedido
- **enderecos-cliente** — Endereços de entrega e cobrança
- **perfis-cliente** — Perfis e vinculações de cliente
- **frete** — Cálculo de frete e formas de envio
- **configuracao-frete** — Configuração de formas de frete e tabelas de CEP
- **multicd** — Centros de distribuição e estoque distribuído
- **notas-fiscais** — Notas fiscais eletrônicas (NF-e)
- **pagamentos** — Métodos e configurações de pagamento
- **cupons** — Cupons de desconto com 21 endpoints
- **carrinho-compras** — Gestão de carrinhos de compra
- **listagem-carrinho** — Nova API de listagem de carrinhos
- **informacoes-adicionais** — Campos customizados em produtos
- **listas-preco-b2b** — Tabelas de preço B2B/atacado
- **emissores-etiqueta** — Integração de etiquetas de envio
- **etiquetas-mercado-livre** — Etiquetas do Mercado Livre
- **etiquetas-hub** — Etiquetas do sistema HUB
- **scripts-externos** — Scripts JavaScript na vitrine
- **newsletter** — Gestão de assinantes
- **parceiros** — Gestão de parceiros/revendedores
- **palavras-chave** — Palavras-chave de SEO
- **produtos-vendidos** — Histórico de vendas
- **usuarios** — Usuários administrativos

#### Agentes (10)
- **configuracao-aplicativo** — Assistente de configuração inicial
- **gestor-catalogo** — Gestão em massa de catálogo
- **gestor-pedidos** — Gestão de ciclo de pedidos
- **debug-integracao** — Diagnóstico de problemas
- **assistente-migracao** — Orquestrador de migração de outras plataformas
- **migracao-shopify** — Mapeamento de campos Shopify → Tray
- **migracao-woocommerce** — Mapeamento de campos WooCommerce → Tray
- **migracao-magento** — Mapeamento de campos Magento 2 → Tray
- **migracao-vtex** — Mapeamento de campos VTEX → Tray
- **migracao-nuvemshop** — Mapeamento de campos Nuvemshop → Tray

#### Comandos (3)
- **setup** — Guia rápido de configuração
- **referencia-api** — Referência de todos os endpoints
- **validar-integracao** — Checklist de validação

#### Hooks (2)
- **PostToolUse** — Verificação de tokens hardcoded
- **UserPromptSubmit** — Contexto da API Tray quando mencionada
