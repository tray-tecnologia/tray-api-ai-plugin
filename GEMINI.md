# Tray API Plugin — Contexto para Gemini CLI

Documentação ativa da API da Tray. Leia as seções abaixo antes de responder
sobre qualquer integração com a plataforma Tray.

Documentação oficial: https://developers.tray.com.br

---

## Regras obrigatórias

- `access_token` é passado como query parameter em todas as chamadas: `?access_token={token}`.
- URL base: `https://{api_address}/` — retornada no callback OAuth, varia por loja.
- `access_token` expira em 3 horas; `refresh_token` expira em 30 dias.
- Payload JSON envolto na chave do recurso: `{"Product": {...}}`, `{"Order": {...}}`.
- Rate limit: 180 req/min e 10.000 req/dia. Tratar HTTP 429 com retry.
- Paginação máxima: 50 itens por requisição.
- Nunca escrever credenciais como literais — usar variáveis de ambiente.

### Bloco MANDATORY e lint de skills

- Toda skill nova **deve** ter `## MANDATORY: Tool Call(s) Required Before Answering` **imediatamente** após o frontmatter.
- O bloco **deve** incluir chamada **OBRIGATÓRIA(S)** a `node skills/tray-dev/scripts/search_docs.mjs` (sempre).
- Skills com schema local (categoria A: `autorizacao`, `produtos`, `pedidos`, `clientes`, `webhooks`, `variacoes`, `categorias`, `marcas`) **devem** incluir também chamada **OBRIGATÓRIA(S)** a `node skills/<recurso>/scripts/validate.mjs`.
- Validar com `npm run lint:skills`. O CI roda `npm run lint:skills` antes do smoke.

### Validação local

- 8 skills têm `scripts/validate.mjs`: `autorizacao`, `produtos`, `pedidos`,
  `clientes`, `webhooks`, `variacoes`, `categorias`, `marcas`.
- Skills com múltiplos schemas exigem `--schema=<op>`. Use `--list-schemas`
  para descobrir os disponíveis.
- Output humano por default; `--json` para programático. Exit codes:
  `0` válido · `1` inválido · `2` erro de uso.
- Formats BR custom: `cpf`, `cnpj`, `cep`, `ean`, `ncm`, `date`, `datetime`,
  `email`, `uri`. Detalhes em `scripts/lib/SUBSET.md`.

### Busca em docs

Para confirmar comportamento da API antes de gerar código, use a skill `tray-dev`:

```bash
node skills/tray-dev/scripts/search_docs.mjs "<termo>"
node skills/tray-dev/scripts/search_docs.mjs --topic=<slug> "<termo>"
node skills/tray-dev/scripts/search_docs.mjs --json "<termo>"
```

- Cache local em `~/.cache/tray-plugin/dev-docs/` (TTL 24h)
- Exit codes: 0 (ok), 1 (erro execução), 2 (erro de uso)
- Tópicos: `--list-topics` para a lista canônica
- Privacidade: `OPT_OUT_INSTRUMENTATION=true` desativa telemetria

O repositório inclui um servidor MCP em `mcp/`: inicie com `npm run mcp` ou `npx --package=@tray-tecnologia/tray-api-plugin tray-mcp`; expõe `tray.search_docs` e `tray.validate`. Para configurar clientes, veja `mcp/README.md`.

---

## Skill de entrada (carregar primeiro)

@./skills/visao-geral/SKILL.md

---

## Skills carregados (autenticação e pedidos — núcleo)

@./skills/autorizacao/SKILL.md

@./skills/pedidos/SKILL.md

@./skills/webhooks/SKILL.md

---

## Skills carregados (catálogo)

@./skills/produtos/SKILL.md

@./skills/variacoes/SKILL.md

@./skills/categorias/SKILL.md

@./skills/imagens-produtos/SKILL.md

---

## Skills carregados (clientes e pagamentos)

@./skills/clientes/SKILL.md

@./skills/pagamentos/SKILL.md

@./skills/frete/SKILL.md

---

## Skills adicionais disponíveis

Para os recursos abaixo, leia o skill correspondente quando o desenvolvedor
mencionar o tema:

| Recurso | Arquivo |
|---------|---------|
| Marcas | `skills/marcas/SKILL.md` |
| Kits / combos | `skills/kits/SKILL.md` |
| Características | `skills/caracteristicas/SKILL.md` |
| Informações adicionais | `skills/informacoes-adicionais/SKILL.md` |
| Status de pedido | `skills/status-pedido/SKILL.md` |
| Notas fiscais | `skills/notas-fiscais/SKILL.md` |
| Configuração de frete | `skills/configuracao-frete/SKILL.md` |
| Etiquetas HUB | `skills/etiquetas-hub/SKILL.md` |
| Etiquetas Mercado Livre | `skills/etiquetas-mercado-livre/SKILL.md` |
| Emissores de etiqueta | `skills/emissores-etiqueta/SKILL.md` |
| Carrinho de compras | `skills/carrinho-compras/SKILL.md` |
| Listagem de carrinhos | `skills/listagem-carrinho/SKILL.md` |
| Endereços de cliente | `skills/enderecos-cliente/SKILL.md` |
| Perfis de cliente | `skills/perfis-cliente/SKILL.md` |
| Cupons de desconto | `skills/cupons/SKILL.md` |
| Listas de preço B2B | `skills/listas-preco-b2b/SKILL.md` |
| Multi-CD | `skills/multicd/SKILL.md` |
| Informações da loja | `skills/informacoes-loja/SKILL.md` |
| Scripts externos | `skills/scripts-externos/SKILL.md` |
| Parceiros | `skills/parceiros/SKILL.md` |
| Usuários | `skills/usuarios/SKILL.md` |
| Produtos vendidos | `skills/produtos-vendidos/SKILL.md` |
| Palavras-chave | `skills/palavras-chave/SKILL.md` |
| Newsletter | `skills/newsletter/SKILL.md` |
| `tray-dev` | `skills/tray-dev/SKILL.md` |

---

## Agentes disponíveis

| Agente | Arquivo |
|--------|---------|
| Configuração de aplicativo | `agents/configuracao-aplicativo.md` |
| Gestor de catálogo | `agents/gestor-catalogo.md` |
| Gestor de pedidos | `agents/gestor-pedidos.md` |
| Debug de integração | `agents/debug-integracao.md` |
| Assistente de migração | `agents/assistente-migracao.md` |
