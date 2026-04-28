# Plugin Tray API para ferramentas de IA

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-blueviolet)](https://code.claude.com/docs/pt/plugins)
[![API Tray](https://img.shields.io/badge/API-Tray%20E--commerce-orange)](https://developers.tray.com.br)

Plugin completo para integração com as APIs da Tray. Acelera o desenvolvimento de aplicativos e-commerce por parceiros e comunidade na plataforma Tray, fornecendo documentação detalhada de **150+ endpoints**, fluxos de autenticação OAuth, webhooks e boas práticas de integração.

Funciona nativamente com **Claude Code**, **Cursor**, **OpenAI Codex**, **Google Gemini CLI**, **GitHub Copilot**, **JetBrains AI Assistant** e **Windsurf**.

## Pré-requisitos

- Credenciais de API Tray (Consumer Key e Consumer Secret) — obtidas em [developers.tray.com.br](https://developers.tray.com.br/#criando-seu-aplicativo)

## Instalação por ferramenta

### Instalação via pacote Node (recomendado para projetos locais)

Adicione o plugin como dependência de desenvolvimento no seu repositório:

```bash
npm install --save-dev github:tray-tecnologia/tray-api-claude-plugin
# ou
pnpm add -D github:tray-tecnologia/tray-api-claude-plugin
# ou
bun add -d github:tray-tecnologia/tray-api-claude-plugin
```

O pacote será instalado em `node_modules/@tray-tecnologia/tray-api-plugin/` e pode
ser referenciado pelas ferramentas que suportam contexto por arquivos locais.

### Claude Code (instalação nativa via plugin)

```bash
# Via marketplace
/plugin marketplace add tray-tecnologia/tray-api-claude-plugin
/plugin install tray-api@tray-plugins

# Desenvolvimento local
git clone https://github.com/tray-tecnologia/tray-api-claude-plugin.git
claude --plugin-dir ./tray-api-claude-plugin
```

### Cursor

Opção 1 (recomendada): instalar via pacote Node e apontar o rule file para o projeto.

```bash
cp node_modules/@tray-tecnologia/tray-api-plugin/.cursor/rules/tray-api.mdc .cursor/rules/tray-api.mdc
```

Opção 2: clone ou submódulo no projeto de integração. O arquivo `.cursor/rules/tray-api.mdc` é carregado automaticamente quando o Cursor abre o repositório.

```bash
git submodule add https://github.com/tray-tecnologia/tray-api-claude-plugin.git .tray-plugin
```

O Cursor passa a ter acesso a todos os skills via `@skills/` e aos agentes via `@agents/`.

### OpenAI Codex CLI

Opção 1 (recomendada): usar o pacote instalado e importar o `AGENTS.md` no contexto do seu projeto.

```bash
cp node_modules/@tray-tecnologia/tray-api-plugin/AGENTS.md ./
```

Opção 2: clone ou submódulo. O `AGENTS.md` na raiz é carregado automaticamente pelo Codex.

```bash
git submodule add https://github.com/tray-tecnologia/tray-api-claude-plugin.git .tray-plugin
```

### Google Gemini CLI

Opção 1 (recomendada): usar o pacote instalado e copiar o contexto `GEMINI.md`.

```bash
cp node_modules/@tray-tecnologia/tray-api-plugin/GEMINI.md ./
```

Opção 2: clone ou submódulo. O `GEMINI.md` na raiz é carregado automaticamente via sistema hierárquico de contexto.

```bash
git submodule add https://github.com/tray-tecnologia/tray-api-claude-plugin.git .tray-plugin
# Verificar contexto carregado:
/memory show
```

### GitHub Copilot (VS Code)

O arquivo `.github/copilot-instructions.md` deste repositório é reconhecido automaticamente pelo Copilot quando o projeto é aberto no VS Code.

### JetBrains AI Assistant

O arquivo `.aiassistant/rules/tray-api.md` é detectado automaticamente como project rule pelo JetBrains AI Assistant.

### Windsurf (Cascade)

O `AGENTS.md` na raiz é reconhecido automaticamente pelo Cascade como regra always-on.

## Componentes

| Componente | Quantidade | Descrição |
|:--|:--|:--|
| Skills | 34 | Documentação completa de cada recurso da API Tray |
| Agentes | 10 | Fluxos especializados (setup, catálogo, pedidos, debug, migração + 5 especialistas por plataforma) |
| Comandos | 3 | Atalhos rápidos (setup, referência, validação) |
| Hooks | 2 | Validação automática de segurança |

## Skills Disponíveis

### Base
`autorizacao`, `webhooks`, `produtos`, `variacoes`, `imagens-produtos`, `categorias`, `pedidos`, `clientes`, `informacoes-loja`

### Complementar
`caracteristicas`, `marcas`, `kits`, `status-pedido`, `enderecos-cliente`, `perfis-cliente`, `frete`, `configuracao-frete`, `multicd`, `notas-fiscais`, `pagamentos`

### Avançado
`cupons`, `carrinho-compras`, `listagem-carrinho`, `informacoes-adicionais`, `listas-preco-b2b`, `emissores-etiqueta`, `etiquetas-mercado-livre`, `etiquetas-hub`, `scripts-externos`, `newsletter`, `parceiros`, `palavras-chave`, `produtos-vendidos`, `usuarios`

## Agentes

### Principais

| Agente | Descrição |
|:--|:--|
| `/tray-api:configuracao-aplicativo` | Guia de setup inicial e configuração OAuth |
| `/tray-api:gestor-catalogo` | Gestão em massa de catálogo (produtos, categorias, variações) |
| `/tray-api:gestor-pedidos` | Ciclo completo de pedidos (criação, status, fulfillment) |
| `/tray-api:debug-integracao` | Diagnóstico de problemas e erros de API |
| `/tray-api:assistente-migracao` | Orquestra migração de outras plataformas; ativa o subagente da plataforma de origem |

### Subagentes de Migração

Ativados automaticamente pelo `assistente-migracao`. Consulte [agents/AGENTES.md](agents/AGENTES.md) para guia completo de escolha de agente.

| Subagente | Plataforma de Origem |
|:--|:--|
| `agents/migracao/shopify.md` | Shopify |
| `agents/migracao/woocommerce.md` | WooCommerce |
| `agents/migracao/magento.md` | Magento 2 |
| `agents/migracao/vtex.md` | VTEX |
| `agents/migracao/nuvemshop.md` | Nuvemshop |

## Comandos

| Comando | Descrição |
|:--|:--|
| `/tray-api:setup` | Configuração rápida de integração |
| `/tray-api:referencia-api` | Referência completa de endpoints |
| `/tray-api:validar-integracao` | Checklist de validação pré-publicação |

## Exemplo de Uso

```bash
# 1. Adicione o marketplace
❯ /plugin marketplace add tray-tecnologia/tray-api-claude-plugin
  ⎿  Successfully added marketplace: tray-plugins

# 2. Instale o plugin
❯ /plugin install tray-api@tray-plugins
  ⎿  ✓ Installed tray-api. Run /reload-plugins to activate.

# 3. Ative o plugin
❯ /reload-plugins
  ⎿  Reloaded: 1 plugins · 34 skills · 5 agents · 2 hooks · 1 plugin MCP server · 0 plugin LSP servers
```

```bash
# Veja todas as skills disponíveis
❯ Quais skills disponíveis?

⏺ Aqui estão as skills disponíveis:

  Tray API - Setup & Auth:
  - /tray-api:setup — Guia rápido de configuração inicial
  - /tray-api:autorizacao — Fluxo OAuth 2.0, tokens, refresh
  - /tray-api:validar-integracao — Valida código de integração
  - /tray-api:referencia-api — Referência rápida de endpoints
  - /tray-api:webhooks — Notificações em tempo real

  Tray API - Catálogo:
  - /tray-api:produtos — CRUD de produtos
  - /tray-api:variacoes — Variações/SKUs
  - /tray-api:categorias — Árvore de categorias
  - /tray-api:marcas — Marcas/fabricantes
  - /tray-api:imagens-produtos — Upload de imagens
  - /tray-api:caracteristicas — Propriedades de produtos
  - /tray-api:informacoes-adicionais — Campos customizados
  - /tray-api:kits — Kits/combos de produtos

  Tray API - Pedidos & Frete:
  - /tray-api:pedidos — Ciclo completo de pedidos
  - /tray-api:status-pedido — Status personalizados
  - /tray-api:notas-fiscais — NF-e
  - /tray-api:frete — Cálculo de frete
  - /tray-api:configuracao-frete — Métodos de envio
  - /tray-api:carrinho-compras — Carrinho de compras
  - /tray-api:listagem-carrinho — Listagem de carrinhos
  - /tray-api:etiquetas-hub — Etiquetas HUB
  - /tray-api:etiquetas-mercado-livre — Etiquetas ML
  - /tray-api:emissores-etiqueta — Emissores de etiqueta

  Tray API - Clientes & Pagamentos:
  - /tray-api:clientes — CRUD de clientes
  - /tray-api:enderecos-cliente — Endereços
  - /tray-api:perfis-cliente — Perfis/segmentos
  - /tray-api:pagamentos — Meios de pagamento
  - /tray-api:cupons — Cupons de desconto
  - /tray-api:listas-preco-b2b — Preços B2B

  Tray API - Loja & Outros:
  - /tray-api:informacoes-loja — Dados da loja
  - /tray-api:scripts-externos — Scripts JS na vitrine
  - /tray-api:multicd — Centros de distribuição
  - /tray-api:parceiros — Parceiros/revendedores
  - /tray-api:usuarios — Usuários administrativos
  - /tray-api:produtos-vendidos — Analytics de vendas
  - /tray-api:palavras-chave — SEO
  - /tray-api:newsletter — Assinaturas de newsletter
```

```bash
# Exemplos de uso
> /tray-api:setup
# Configura credenciais e testa conexão com a API Tray

> Como listar todos os produtos da minha loja?
# O plugin fornece automaticamente a documentação do endpoint GET /products

> /tray-api:validar-integracao
# Valida se sua integração está pronta para homologação
```

## Contribuindo

Contribuições são bem-vindas! Abra uma issue ou envie um pull request em [GitHub](https://github.com/tray-tecnologia/tray-api-claude-plugin).

## Referências

- **API Tray:** https://developers.tray.com.br
- **Plataforma Tray:** https://tray.com.br
- **Claude Code Plugins:** https://code.claude.com/docs/pt/plugins

## Licença

GNU General Public License v3.0 — veja [LICENSE](LICENSE) para detalhes.
