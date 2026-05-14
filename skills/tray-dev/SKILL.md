---
name: tray-dev
description: Skill de busca em developers.tray.com.br. Utilize quando o desenvolvedor precisar de informações atualizadas sobre endpoints, parâmetros, formatos ou exemplos da API Tray oficial. Substitui referências estáticas envelhecidas por busca local sobre snapshot fresco da SPA.
when_to_use: Sempre que precisar confirmar comportamento atual de um endpoint, formato de campo, código de erro, ou exemplo de uso na API Tray. Especialmente útil antes de gerar payload novo (validar contra fonte oficial).
when_not_to_use: Não use em lugar das skills de recurso (`tray-produtos`, `tray-pedidos`, etc.) quando a tarefa já for implementar payload ou fluxo completo — use esta skill só para consultar a SPA oficial; validação de payload continua em `validate.mjs` das skills que possuem schema.
---

## Antes de responder

1. Identifique o termo de busca a partir da pergunta do usuário
2. Rode:

   ```
   node skills/tray-dev/scripts/search_docs.mjs "<termo>"
   ```

3. Use os resultados como **fonte primária**. Cite o link âncora retornado.
4. Se a busca retornar 0 resultados, avise o usuário e use seu conhecimento como fallback **explicitamente sinalizado**.
5. Se precisar restringir a um recurso, use `--topic=<slug>` (ver lista de tópicos).
6. Se precisar de output programático, use `--json`.

## Visão geral

`tray-dev` indexa localmente `https://developers.tray.com.br` (fetch + cache 24h) e oferece busca lexical (BM25) sobre todos os endpoints, campos, exemplos e códigos de erro da API Tray, em < 100 ms p95 com cache quente. Substitui a documentação estática que envelhece entre releases.

A primeira execução faz fetch da SPA pública (~625 KB), parseia em ~700 seções (H1/H2/H3) e indexa em `~/.cache/tray-plugin/dev-docs/`. Execuções subsequentes (24h) usam cache.

## CLI

### Sintaxe

```bash
node skills/tray-dev/scripts/search_docs.mjs "<query>"
node skills/tray-dev/scripts/search_docs.mjs --topic=<slug> "<query>"
node skills/tray-dev/scripts/search_docs.mjs --json "<query>"
node skills/tray-dev/scripts/search_docs.mjs --limit=<n> "<query>"
node skills/tray-dev/scripts/search_docs.mjs --no-cache "<query>"
node skills/tray-dev/scripts/search_docs.mjs --refresh
node skills/tray-dev/scripts/search_docs.mjs --list-topics
node skills/tray-dev/scripts/search_docs.mjs --help
```

### Flags

| Flag | Default | Descrição |
|---|---|---|
| `--topic=<slug>` | (todos) | Filtra por recurso (ex.: `produtos`, `pedidos`) |
| `--json` | false | Output JSON estruturado |
| `--limit=<n>` | 5 | Máximo de resultados |
| `--no-cache` | false | Força refetch da SPA |
| `--refresh` | false | Re-indexa sem fazer query |
| `--list-topics` | false | Lista tópicos disponíveis |
| `--help` | false | Ajuda |

### Exit codes

- `0` query OK (mesmo se 0 resultados)
- `1` erro de execução (rede falha + sem cache; falha de parse)
- `2` erro de uso (flag desconhecida, query vazia, topic inexistente)

## Tópicos disponíveis

Use `--list-topics` para a lista atualizada. Mapeamento canônico:

| Slug | Recurso |
|---|---|
| `autorizacao` | OAuth, tokens |
| `produtos` | Catálogo de produtos |
| `pedidos` | Pedidos e ciclo |
| `clientes` | Clientes (PF/PJ) |
| `webhooks` | Notificações |
| `variacoes` | SKUs / variações |
| `categorias` | Árvore de categorias |
| `marcas` | Marcas |
| `cupons` | Cupons de desconto |
| `multicd` | Multi-CD |
| `frete` | Cálculo de frete |
| `pagamentos` | Pagamentos (PIX, boleto, cartão) |
| `notas-fiscais` | NF-e |
| `status-pedido` | Status customizados |
| `kits` | Kits / combos |
| `caracteristicas` | Atributos de produto |
| `informacoes-loja` | Dados da loja |
| `carrinho-compras` | Carrinho |
| `listagem-carrinho` | Listagem de carrinhos |
| `listas-preco-b2b` | Preços B2B |
| `usuarios` | Usuários administrativos |
| `parceiros` | Parceiros |
| `palavras-chave` | SEO |
| `newsletter` | Newsletter |
| `produtos-vendidos` | Histórico de vendas |
| `imagens-produtos` | Imagens de produtos |
| `informacoes-adicionais` | Campos extras |
| `etiquetas-hub` | Etiquetas HUB |
| `etiquetas-mercado-livre` | Etiquetas ML |
| `emissores-etiqueta` | Emissores |
| `configuracao-frete` | Config de frete |
| `scripts-externos` | JS na vitrine |

## Variáveis de ambiente

| Var | Default | Efeito |
|---|---|---|
| `TRAY_DOCS_CACHE_DIR` | `~/.cache/tray-plugin/dev-docs/` | Override do cache |
| `TRAY_DOCS_CACHE_TTL_MS` | `86400000` (24h) | Override do TTL |
| `TRAY_DOCS_BASE_URL` | `https://developers.tray.com.br` | Override da URL fonte |
| `OPT_OUT_INSTRUMENTATION` | unset | `true` desativa header de telemetria |

## Exemplos

```bash
# Conceitual
node skills/tray-dev/scripts/search_docs.mjs "como autenticar via OAuth"

# Endpoint específico
node skills/tray-dev/scripts/search_docs.mjs "POST /products"

# Restrito por recurso
node skills/tray-dev/scripts/search_docs.mjs --topic=pedidos "cancelamento"

# Output JSON para integração
node skills/tray-dev/scripts/search_docs.mjs --json "webhook"

# Forçar atualização da doc
node skills/tray-dev/scripts/search_docs.mjs --refresh
```

## Privacidade

Por padrão, o `search_docs.mjs` envia o header `X-Tray-AI-Telemetry: on` para `developers.tray.com.br` indicando origem (não envia conteúdo da query). Para desativar:

```bash
export OPT_OUT_INSTRUMENTATION=true
```

## Limitações

- Sinônimos PT-BR cobrem ~23 grupos no MVP. Expansão via PR em `assets/synonyms-pt-br.json`.
- Stemmer simples (sufixos comuns). Não é Snowball/RSLP completo.
- Sem busca semântica/embeddings (out of scope; lexical é suficiente para 625 KB de doc).
- O `body` retornado nos resultados é truncado em 200 caracteres.

## Erros comuns

- **`OFFLINE_NO_CACHE`** — sem rede e sem cache. Rode com rede uma vez para popular cache inicial.
- **`INVALID_TOPIC`** — slug não está no mapa. Use `--list-topics`.
- **Resultados zero para query óbvia** — provavelmente sinônimo PT-BR faltando. Abra PR em `assets/synonyms-pt-br.json`.
