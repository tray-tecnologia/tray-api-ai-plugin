# Tray MCP Server

Servidor **Model Context Protocol (MCP)** que expõe busca na documentação oficial Tray e validação local de payloads JSON. Destina-se a qualquer cliente compatível com MCP — Claude Desktop, Cursor, Continue.dev, Zed, agentes customizados ou backends que falam MCP sobre **stdio**.

---

## Visão geral

O servidor é implementado em **JavaScript puro ESM** no arquivo [`mcp/server.mjs`](server.mjs), usando transport **stdio** (stdin/stdout) conforme o protocolo MCP. Ele **reutiliza** a biblioteca [`scripts/lib/search-index.mjs`](../scripts/lib/search-index.mjs) (motor BM25 / índice P1.2) e [`scripts/lib/validate-schema.mjs`](../scripts/lib/validate-schema.mjs) (validação P1.1), garantindo o mesmo comportamento dos scripts locais do plugin.

Para usuários do pacote npm [`@tray-tecnologia/tray-api-plugin`](https://www.npmjs.com/package/@tray-tecnologia/tray-api-plugin), o entrypoint é o bin **`tray-mcp`**, declarado no `package.json` do pacote e executável via `npx`.

---

## Tools expostas

| Nome | Descrição curta | Schema input | Output |
|------|-----------------|--------------|--------|
| `tray.search_docs` | Busca BM25 em developers.tray.com.br | `{ query, topic?, limit? }` | `{ query, results, totalResults, cache, took }` (e campos auxiliares quando aplicável) |
| `tray.validate` | Valida payload JSON contra schema local da skill | `{ schema, payload }` | `{ valid, schema, errors }` |

Os retornos são entregues pelo MCP como conteúdo de texto JSON na resposta da tool (campo `content`).

### `tray.search_docs`

Exemplo de requisição JSON-RPC `tools/call` (conceito; o cliente MCP monta o envelope completo):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tray.search_docs",
    "arguments": {
      "query": "refresh_token oauth",
      "topic": "autorizacao",
      "limit": 5
    }
  }
}
```

### `tray.validate`

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "tray.validate",
    "arguments": {
      "schema": "produto.create",
      "payload": {
        "Product": {
          "name": "Produto exemplo",
          "price": "29.90"
        }
      }
    }
  }
}
```

---

## Instalação por cliente MCP

Padrão recomendado: **`command`: `npx`** com **`args`**: `["-y", "--package=@tray-tecnologia/tray-api-plugin", "tray-mcp"]`, opcionalmente com **`env`** para variáveis listadas abaixo.

### Claude Desktop

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tray": {
      "command": "npx",
      "args": ["-y", "--package=@tray-tecnologia/tray-api-plugin", "tray-mcp"]
    }
  }
}
```

### Cursor

- Projeto: `.cursor/mcp.json` no diretório do projeto, ou entrada equivalente na configuração global do Cursor.

```json
{
  "mcpServers": {
    "tray": {
      "command": "npx",
      "args": ["-y", "--package=@tray-tecnologia/tray-api-plugin", "tray-mcp"]
    }
  }
}
```

(O template canônico do repositório inclui também `env`; veja [`.mcp.json`](../.mcp.json).)

### Continue.dev

- **Usuário:** `~/.continue/config.json`
- **Projeto:** `.continue/config.json`

Continue aceita o **mesmo formato JSON** usado por Claude/Cursor: copie o objeto para um arquivo em [`.continue/mcpServers/`](https://docs.continue.dev/customize/deep-dives/mcp) (por exemplo `.continue/mcpServers/tray.json` na raiz do workspace), ou inclua um bloco YAML `mcpServers` na config principal com `type: stdio`:

```yaml
mcpServers:
  - name: Tray API
    type: stdio
    command: npx
    args:
      - "-y"
      - "--package=@tray-tecnologia/tray-api-plugin"
      - "tray-mcp"
    env:
      OPT_OUT_INSTRUMENTATION: "false"
```

Equivalente JSON (mesmo conteúdo semântico que [`.mcp.json`](../.mcp.json) na raiz do plugin):

```json
{
  "mcpServers": {
    "tray": {
      "command": "npx",
      "args": ["-y", "--package=@tray-tecnologia/tray-api-plugin", "tray-mcp"],
      "env": {
        "OPT_OUT_INSTRUMENTATION": "false"
      }
    }
  }
}
```

### Genérico / outros (Zed, agents customizados)

Caminhos de configuração variam por produto; o padrão permanece **`command`: `npx`** + **`args`** + **`env`** quando necessário.

Para desenvolvimento a partir do clone do repositório: `npm install` e **`npm run mcp`** (equivale a `node mcp/server.mjs`). Aponte o cliente para esse comando em vez de `npx` se preferir rodar o servidor a partir do código-fonte.

---

## Variáveis de ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `TRAY_DOCS_CACHE_DIR` | `~/.cache/tray-plugin/dev-docs/` | Diretório do cache de documentação |
| `TRAY_DOCS_CACHE_TTL_MS` | `86400000` (24h) | TTL do cache em ms |
| `TRAY_DOCS_BASE_URL` | `https://developers.tray.com.br/` | URL base do site de docs |
| `OPT_OUT_INSTRUMENTATION` | `false` | Desabilita telemetria do plugin (futuro) |

A CLI `skills/tray-dev/scripts/search_docs.mjs` lê `TRAY_DOCS_BASE_URL` do ambiente; o servidor MCP usa hoje a **mesma URL padrão** embutida (`https://developers.tray.com.br/`).

---

## Logs e debug

O **stdout** é reservado ao canal MCP — **nenhum** log da aplicação deve ir para lá (qualquer texto extra quebra o protocolo). Mensagens de diagnóstico vão para **stderr** (`console.error`).

Para depuração manual:

```bash
node mcp/server.mjs 2> /tmp/tray-mcp.log
```

Sinal de boot bem-sucedido no stderr: linha no formato **`tray-mcp-server vX.Y.Z listo (stdio).`** (versão conforme `package.json`).

---

## Troubleshooting

### Server não inicia

Se stderr estiver vazio ou o processo encerrar logo de cara: confirme **Node 20+** (`node -v`) e que **`npm install`** foi executado no repositório quando rodar localmente. Com o pacote instalado globalmente ou via `npx`, **`which tray-mcp`** deve resolver para o binário do pacote.

### Cache vazio / sem rede

Se a tool **`tray.search_docs`** retornar erro **`OFFLINE_NO_CACHE`**, não há índice em disco e a rede não está disponível para baixar. Solução: execute uma vez **com rede** para hidratar o cache (mesmo diretório configurável por `TRAY_DOCS_CACHE_DIR`).

### Schema não encontrado

Respostas com **`SCHEMA_NOT_FOUND`** incluem o campo **`available`** com a lista de nomes de schema carregados. Confira o valor de `schema` na chamada contra os arquivos em **`skills/<recurso>/schemas/*.json`** (nome do schema = basename sem `.json`).

---

## Execução local no repositório

Útil para contribuir ou depurar sem publicar pacote:

```bash
git clone https://github.com/tray-tecnologia/tray-api-claude-plugin.git
cd tray-api-claude-plugin
npm install
npm run mcp
```

Configure o cliente MCP para executar `node` com argumento absoluto a `mcp/server.mjs`, ou use `npm run mcp` como comando único se o cliente permitir scripts npm.

---

## Referências

- Template canônico de cliente: [`.mcp.json`](../.mcp.json) na raiz do repositório.
- Especificação MCP: [modelcontextprotocol.io](https://modelcontextprotocol.io/)
- Subset JSON Schema usado pela validação local: [`scripts/lib/SUBSET.md`](../scripts/lib/SUBSET.md)
- Conceitos da busca em docs (skill interna): [`skills/tray-dev/SKILL.md`](../skills/tray-dev/SKILL.md)
