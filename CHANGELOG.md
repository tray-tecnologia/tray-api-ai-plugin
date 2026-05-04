# Changelog

## [Unreleased]

### Alterado

- **Licença migrada de GPL-3.0 para MIT.** Aplica-se a versões futuras; cópias previamente distribuídas mantêm os termos GPL-3.0 originais. Atualizados `LICENSE`, badge e seções de licença em `README.md`, `CONTRIBUTING.md` e o campo `license` em `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.cursor-plugin/plugin.json` e `.codex-plugin/plugin.json`. Decisão alinhada com o padrão permissivo adotado por toolkits de IA de referência (ex.: Shopify/Shopify-AI-Toolkit)
- **Repositório renomeado de `tray-api-claude-plugin` para `tray-api-ai-plugin`** para refletir compatibilidade multi-plataforma (Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot, JetBrains AI, Windsurf). Comandos de instalação atualizados em `README.md`, `CONTRIBUTING.md` e `SECURITY.md`. Campo `repository` atualizado nos cinco manifests de plugin. Nome do pacote npm (`@tray-tecnologia/tray-api-plugin`) e ID do plugin (`tray-api`) **não foram alterados**, preservando comandos como `npm install @tray-tecnologia/tray-api-plugin` e `/plugin install tray-api@tray-plugins`. `scripts/cleanup-plugin-installations.sh` reconhece ambos os nomes durante a transição. URLs antigas continuam funcionando via redirect permanente do GitHub

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
