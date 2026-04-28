# Changelog

## [Unreleased]

### Adicionado

- `package.json` na raiz para distribuição como pacote Node instalável
- `.cursor-plugin/plugin.json` para manifesto nativo de distribuição no Cursor
- `.codex-plugin/plugin.json` para manifesto nativo de distribuição no Codex
- `gemini-extension.json` para extensão nativa no Gemini CLI
- `scripts/sync-version.js` para sincronizar e validar versão entre todos os manifests

### Alterado

- `.claude-plugin/plugin.json` e `.claude-plugin/marketplace.json` alinhados para versão `1.1.0`
- `README.md` com fluxo de instalação via `npm`/`pnpm`/`bun` e instruções por ferramenta usando `node_modules`
- `scripts/smoke-test.js` para validar também os novos manifests de distribuição
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
