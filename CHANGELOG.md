# Changelog

## [2.0.0] - 2026-05-05

### Adicionado

- Servidor MCP em `mcp/` (JS puro, ESM) compatível com qualquer cliente MCP (Claude Desktop, Cursor, Continue.dev, Zed, agents customizados, backends).
- 2 tools MCP: `tray.search_docs` (BM25 em developers.tray.com.br, reusa P1.2) e `tray.validate` (validação estrutural com schemas locais, reusa P1.1).
- Entrada `bin: {tray-mcp}` em `package.json` — após `npm install -g`, comando `tray-mcp` fica disponível globalmente; via `npx --package=@tray-tecnologia/tray-api-plugin tray-mcp` sem instalar.
- Script `npm run mcp` para boot local (stdio).
- `.mcp.json` no root como template canônico para configuração de clientes MCP.
- `mcp/README.md` (212 linhas) com setup detalhado para Claude Desktop, Cursor, Continue.dev e clientes genéricos.
- `mcp/lib/load-schemas.mjs` — descobre schemas em `skills/<recurso>/schemas/*.json` em runtime (8 testes).
- `mcp/tools/validate.mjs` — handler MCP que reusa `validatePayload` com input Zod (8 testes).
- `mcp/tools/search-docs.mjs` — handler MCP que reusa `search`/`loadOrFetch` com índice memoizado (8 testes).
- `mcp/server.mjs` — entrypoint stdio com `createServer()` exportado para testes (boot < 200ms, stdout silencioso).
- Suite `tests/mcp/` com 30 testes (load-schemas, tools-validate, tools-search-docs, server in-process via `InMemoryTransport`).
- Smoke test seção 15 (3 checks via JSON-RPC stdio: ListTools, CallTool inválido, total).
- Bloco 14 em `docs/CENARIOS-DE-TESTE.md` (5 cenários manuais para clientes MCP — boot stand-alone, Claude Desktop, Cursor, schema not found, modo offline).

### Mudado

- `package.json` ganha bloco `dependencies` (`@modelcontextprotocol/sdk@^1.29.0`, `zod@^3.23.0`) — primeiras dependências de runtime do projeto.
- `files` em `package.json` inclui `"mcp/**"` e `".mcp.json"` para distribuição via npm.
- README.md ganha seção `## Servidor MCP (mcp/)` com uso rápido e link para `mcp/README.md`.
- CONTRIBUTING.md ganha seção `## Como evoluir o servidor MCP` com guia para adicionar tools.
- AGENTS.md, GEMINI.md, `.cursor/rules/tray-api.mdc`, `.aiassistant/rules/tray-api.md` e `.github/copilot-instructions.md` referenciam o servidor MCP.
- AGENTS.md ganhou entrada na tabela "Comandos disponíveis" para `npm run mcp`.

### Notas

- `console.log` é proibido em qualquer arquivo de `mcp/` (quebraria o protocolo MCP via stdio). Apenas `console.error` permitido.
- Total: 356 testes (350 → 356 após Task 6 in-process); 104 smoke checks (101 → 104 após seção 15).

## [1.5.0] - 2026-05-04

### Added

- Bloco `## MANDATORY: Tool Call(s) Required Before Answering` em todas as 34 skills de recursos da API:
  - 8 skills da categoria A (`autorizacao`, `produtos`, `pedidos`, `clientes`, `webhooks`, `variacoes`, `categorias`, `marcas`) com `search_docs.mjs` **e** `validate.mjs`.
  - 19 skills da categoria B (escrita sem `validate.mjs`: `cupons`, `multicd`, `pagamentos`, `notas-fiscais`, `status-pedido`, `kits`, `caracteristicas`, `carrinho-compras`, `listas-preco-b2b`, `parceiros`, `newsletter`, `imagens-produtos`, `informacoes-adicionais`, `etiquetas-hub`, `emissores-etiqueta`, `enderecos-cliente`, `perfis-cliente`, `configuracao-frete`, `scripts-externos`) com `search_docs.mjs`.
  - 7 skills da categoria C (somente leitura: `usuarios`, `produtos-vendidos`, `palavras-chave`, `listagem-carrinho`, `informacoes-loja`, `frete`, `etiquetas-mercado-livre`) com `search_docs.mjs`.
- `scripts/lint-skills.mjs` — linter de conformidade do bloco MANDATORY com 6 regras (presença, posição, comando search, comando validate, ausência de duplicata, frase imperativa). Suporta `--json`, `--help` e arquivo único; exit codes Unix (0/1/2).
- Suite `tests/lint-skills/` com 9 fixtures + 10 testes cobrindo as 6 regras + skip de `tray-dev`/`visao-geral` + `findSkillFiles`.
- Script `npm run lint:skills`.
- Smoke test seção 14 chama `lint:skills` (101 checks no total).
- Step `Lint skills (bloco MANDATORY)` no CI (`.github/workflows/ci.yml`), antes do smoke.
- Seção "Mandatory Tool Calls em SKILL.md" no `README.md`.
- Seção "Como adicionar uma skill nova" no `CONTRIBUTING.md` com 3 templates (A/B/C).
- Bloco 13 em `docs/CENARIOS-DE-TESTE.md` (6 cenários do `lint-skills`).

### Changed

- As 8 skills da categoria A tiveram o "step 5" (`validate.mjs`) movido do `## Antes de responder` para o novo bloco `## MANDATORY: Tool Calls Required Before Answering`, eliminando duplicação.
- `AGENTS.md`, `GEMINI.md`, `.cursor/rules/tray-api.mdc`, `.aiassistant/rules/tray-api.md` e `.github/copilot-instructions.md` referenciam o novo padrão e o linter `npm run lint:skills`.
- `AGENTS.md` ganhou entrada na tabela "Comandos disponíveis" para `lint:skills`.

## [1.4.0] - 2026-05-04

### Added

- Skill nova `tray-dev` com `scripts/search_docs.mjs` — busca lexical local (BM25 + sinônimos PT-BR) em `developers.tray.com.br`, com cache 24h em `~/.cache/tray-plugin/dev-docs/`.
- CLI com 6 flags: `--topic=<slug>`, `--json`, `--limit=<n>`, `--no-cache`, `--refresh`, `--list-topics`, `--help`.
- Output JSON Shopify-like com `results`, `score`, `topic`, `level`, `anchor`, `cache`, `took`.
- Exit codes 0/1/2 (Unix-compliant: 0 ok mesmo com 0 resultados; 1 erro execução; 2 erro de uso).
- Mapa canônico de 35 tópicos (slug → H1 da SPA) em `scripts/lib/topics-map.mjs`.
- Dicionário inicial de 23 grupos de sinônimos PT-BR ↔ termos da API em `skills/tray-dev/assets/synonyms-pt-br.json`.
- Telemetria opt-out via `OPT_OUT_INSTRUMENTATION=true`.
- Cache de override via env: `TRAY_DOCS_CACHE_DIR`, `TRAY_DOCS_CACHE_TTL_MS`, `TRAY_DOCS_BASE_URL`.
- Suite de testes nova em `tests/search/` (~62 testes, fetch mockado, sem rede em CI).
- Novo Bloco 12 em `docs/CENARIOS-DE-TESTE.md` (search_docs CLI + offline).
- Smoke test seção 13 (4 checks via fixture mockada).
- Stemmer PT-BR simples em `scripts/lib/stemmer-pt-br.mjs`.
- Splitter de markdown em `scripts/lib/markdown-splitter.mjs`.
- Cache helper em `scripts/lib/docs-cache.mjs` (TTL, hash, fallback offline).
- Indexer/searcher BM25 em `scripts/lib/search-index.mjs`.

### Changed

- `npm test` agora cobre `tests/**/*.test.mjs` (validate + search).
- `README.md` ganha seção "Busca em docs com `search_docs.mjs`".
- `CONTRIBUTING.md` ganha seção "Como expandir sinônimos do `search_docs.mjs`".
- AGENTS.md, GEMINI.md, .cursor/rules, .aiassistant/rules, .github/copilot-instructions.md atualizados com bloco "Busca em docs".

### Privacy

- Header `X-Tray-AI-Telemetry: on` enviado por default ao buscar `developers.tray.com.br`. **Nenhuma query é enviada no header** — apenas indicação de origem do plugin. Opt-out documentado em README.

## [1.3.0] - 2026-05-04

### Adicionado

- `validate.mjs` v2 com saída JSON estruturada (`--json`), entrada via stdin,
  seleção explícita de schema (`--schema=`), listagem (`--list-schemas`),
  exit codes 0/1/2 distintos e flag `--help`.
- `scripts/lib/formats-br.mjs` com 9 formats: `cpf`, `cnpj`, `cep`, `ean`,
  `ncm`, `date`, `datetime`, `email`, `uri`. Algoritmos de DV implementados
  para CPF, CNPJ e GTIN (EAN). Aplicados via `format: <nome>` nos schemas.
- Schemas multi-operação em `skills/<skill>/schemas/<recurso>.<op>.json`
  para 8 skills: `autorizacao` (auth-request, auth-refresh), `produtos`
  (produto.create, produto.update), `pedidos` (pedido.create, pedido.update),
  `clientes` (cliente.create, cliente.update), `webhooks` (webhook.payload),
  `variacoes` (variacao.create, variacao.update), `categorias`
  (categoria.create, categoria.update), `marcas` (marca.create, marca.update)
  — total: 15 schemas.
- 3 skills novas com `validate.mjs`: `variacoes`, `categorias`, `marcas`.
- Suite de testes em `tests/validate/` com `node --test` nativo (≥ 200
  casos cobrindo válidos, inválidos e oracle AJV em features comuns).
- `scripts/lint-schemas.mjs` rejeita schemas que usam keywords fora do
  subset documentado. Integrado ao `npm run smoke` (seção 12).
- `scripts/lib/SUBSET.md` documenta o subset JSON Schema suportado em
  runtime (`required`, `type`, `enum`, `maxLength`, `minimum`, `pattern`,
  `format`, `additionalProperties: false`).
- `tests/validate/helpers/ajv-oracle.mjs` — wrapper AJV usado nos testes
  como oracle de conformidade Draft-07 nas features comuns.
- `tests/validate/helpers/fixtures.mjs` com CPFs, CNPJs, EANs e NCMs
  canônicos válidos e inválidos compartilhados entre testes.
- Script `npm test` em `package.json` rodando `node --test tests/validate/`.
- `package-lock.json` na raiz.

### Alterado

- `scripts/lib/validate-schema.mjs` v2 — refatorado para suportar `format`,
  `pattern`, múltiplos schemas, output JSON e seleção explícita de operação.
  Erros agora carregam `path` e `keyword` (formato Shopify-like).
- 5 skills migradas (`autorizacao`, `produtos`, `pedidos`, `clientes`,
  `webhooks`) — `assets/schema.json` removido, substituído por `schemas/`.
  Passo 5 do "Antes de responder" agora inclui `--schema=<op>`.
- `package.json` ganha `devDependencies: ajv ^8.17.1, ajv-formats ^3.0.1`,
  campo `engines.node: ">=20"` e script `npm test`.
- `.github/workflows/ci.yml` agora roda `npm ci && npm test` antes de
  `npm run smoke` em matrix Node 20/22.
- `scripts/smoke-test.js` — seções 6 e 7 reescritas para iterar pelos
  schemas multi-operação (1 caso válido + 1 inválido por schema). Nova
  seção 12 executa `lint-schemas.mjs` em todos os schemas das 8 skills.
- Cenário 3.2 do `docs/CENARIOS-DE-TESTE.md` reescrito: comportamento
  alterado em 1.3.0 — schema agora rejeita CPF malformado pelo `format: cpf`,
  não apenas pelo `AGENTS.md`. ID `3.2` mantido (estável).
- `README.md` ganha seção "Validação local com `validate.mjs`" detalhando
  contrato CLI completo.
- `CONTRIBUTING.md` reescreve seção de criação de skill para multi-operação;
  adiciona seção "Como criar um schema novo" com checklist passo a passo.
- `AGENTS.md`, `GEMINI.md`, `.aiassistant/rules/tray-api.md`,
  `.cursor/rules/tray-api.mdc` e `.github/copilot-instructions.md` ganham
  bloco "Validação local" com 8 skills, lista de formats BR e exit codes.

### Removido

- `assets/schema.json` em todas as 5 skills migradas (substituído por
  `schemas/<recurso>.<op>.json`).

### Quebra retroativa

- Skills com múltiplas operações exigem agora `--schema=<op>` ao invocar
  `validate.mjs`. Os próprios `SKILL.md` já trazem o exemplo correto;
  automações externas que chamam o CLI direto sem flag precisam atualizar.

---

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
- `scripts/smoke-test.js` — seção 11 valida o **contrato `{ok, reason}`** de todos os hooks tipo `prompt`. Diferencia hooks "informativos" (que injetam contexto sem decidir, como o `UserPromptSubmit`) de hooks "decisores" (que precisam declarar o schema oficial). Detecta o anti-padrão "prompt instrui não responda" que causa `hook stopped continuation` na origem
- `docs/ANALISE-HOOK-POSTTOOLUSE-BASH.md` — documento técnico com análise profunda do bug do hook `PostToolUse:Bash`, validação cruzada com a documentação oficial de Claude Code e Cursor, matriz de viabilidade Opção × Plataforma e plano de validação manual

### Alterado

- `hooks/hooks.json` — `matcher` do `UserPromptSubmit` reescrito para cobrir vocabulário PT-BR realista. O matcher antigo (`api.*tray|tray.*api|access_token|...`) só disparava com termos técnicos em inglês e não casava com prompts naturais como *"liste os produtos da minha loja Tray"*. O novo matcher usa classes de caracteres (`[Tt]ray`, `[Aa][Pp][Ii]`) e word boundaries para casar com **"loja Tray"**, **"API Tray"**, **"webhooks da Tray"**, **"produtos/pedidos/clientes da/na Tray"**, **"da minha Tray"**, etc., sem disparar em falsos positivos como **"bandeja (tray) de comida"** ou **"lib de UI chamada Tray"**. Validado contra os 18 cenários relevantes em `docs/CENARIOS-DE-TESTE.md` via `scripts/test-prompt-matcher.mjs`
- `hooks/hooks.json` — prompt do `PostToolUse:Write|Edit` reescrito para retornar JSON estruturado `{"ok": true | false, "reason": "..."}` conforme schema oficial documentado em [Claude Code](http://code.claude.com/docs/en/hooks#prompt-based-hooks) e [Cursor](https://cursor.com/docs/hooks.md). Hooks tipo `prompt` **devem** retornar `{ok, reason}` JSON; instruir "não responda" em linguagem natural fazia a LLM gerar prosa em PT-BR que o orquestrador interpretava como bloqueio, disparando `PostToolUse:Write hook stopped continuation` em arquivos triviais como `.env.example`. As regras de detecção (credencial real hardcoded, payload sem chave do recurso, sugestão de `validate.mjs`, ignorar templates) foram preservadas — mudou apenas o **formato de saída**
- `hooks/hooks.json` — bloco `PostToolUse:Bash` **removido**. Tinha o mesmo defeito estrutural do `Write|Edit` original (prompt instruía silêncio violando o contrato `{ok, reason}`), mas com efeito ainda pior: disparava `PostToolUse:Bash hook stopped continuation` em comandos triviais como `ls`, `find`, `git status`, **interrompendo o fluxo do agente em tarefas legítimas do plugin** (ex.: agente `configuracao-aplicativo` rodando o cenário 1.1 dos testes). A inteligência reativa que ele tentava prover (HTTP 401/429/400/404) foi migrada para o prompt do `UserPromptSubmit`, que é informativo e não bloqueia o fluxo
- `hooks/hooks.json` — prompt do `UserPromptSubmit` ampliado com orientação proativa sobre erros HTTP da Tray: HTTP 401 (renovar via `refresh_token`), HTTP 429 (backoff exponencial / lotes; limites 180 req/min e 10.000 req/dia), HTTP 400 com erro de campo (rodar `skills/<recurso>/scripts/validate.mjs`), HTTP 404 (confirmar `api_address`, específico por loja). Mantém o caráter informativo e não-bloqueante explícito no prompt
- `scripts/smoke-test.js` — adicionada seção 10 que executa `test-prompt-matcher.mjs` como regressão de CI; valida também os novos manifests de distribuição
- Contagem de skills atualizada para **35** em `README.md`, `AGENTS.md`, `.github/copilot-instructions.md` e `.claude-plugin/marketplace.json`
- `GEMINI.md`, `.aiassistant/rules/tray-api.md` e `.cursor/rules/tray-api.mdc` listam a nova skill `visao-geral` como entrypoint, carregada antes das skills de recurso
- `README.md` agora referencia `SECURITY.md` e `CONTRIBUTING.md` na introdução, e descreve fluxo de instalação via `npm`/`pnpm`/`bun` e instruções por ferramenta usando `node_modules`
- `package.json` com scripts `version:check` e `version:set`
- `docs/CENARIOS-DE-TESTE.md` — sub-grupo 7B reescrito: cenários 7.5–7.8 agora validam o comportamento **migrado** (orientação HTTP via `UserPromptSubmit` proativo); 7.9 vira regressão crítica de "Bash trivial não dispara mais nada"; novo cenário 7.10 cobre prompts off-topic dentro do plugin
- Passo 5 da seção "Antes de responder" reescrito nas 5 skills com schema (`autorizacao`, `produtos`, `pedidos`, `clientes`, `webhooks`) deixando explícito que o validador checa apenas **estrutura** (campos obrigatórios, tipos, campos desconhecidos) — não valores reais — e que payloads sintéticos com placeholders são esperados quando os valores virão de variáveis de ambiente, callback OAuth, entrada do usuário ou outras chamadas. Cada skill ganhou um exemplo concreto reaproveitando os campos do schema. Motivação: na execução manual do cenário 1.1 (`docs/CENARIOS-DE-TESTE.md`), a IA pulou o passo 5 raciocinando *"o payload só tem campos vindos de env vars — não há JSON concreto pra passar ao validador"*, leitura razoável mas incorreta da redação anterior. A nova redação remove essa fricção sem mudar comportamento do validador
- `scripts/lib/validate-schema.mjs` — quando `validate.mjs` é chamado sem payload, a mensagem de uso passou a incluir uma dica explícita de que o validador aceita placeholders nos valores. Reforça a mensagem das skills para quem invocar o validador interativamente

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
