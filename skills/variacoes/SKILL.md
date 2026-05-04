---
name: tray-variacoes
description: >
  API de Variações de Produtos da Tray. Utilize quando o desenvolvedor
  precisar gerenciar variantes de produtos (SKUs) como diferentes tamanhos, cores
  ou modelos. Inclui listagem, consulta, cadastro, atualização, exclusão e
  informações sobre limitações de variações por produto.
when_to_use: >
  Use quando o desenvolvedor mencionar: variação, SKU, tamanho, cor, modelo,
  atributo de produto, POST /variants, PUT /variants, estoque por variação,
  preço de variação, código EAN de SKU ou limitação de variantes por produto.
when_not_to_use: >
  Não use para o produto pai (use tray-produtos) nem para características informativas
  sem estoque separado (use tray-caracteristicas). Use para SKUs com atributos como
  cor e tamanho.
---

## MANDATORY: Tool Calls Required Before Answering

> **Estas chamadas são OBRIGATÓRIAS, não opcionais.** Execute-as antes de gerar
> qualquer código ou payload. Se você está respondendo sem ter chamado as duas
> ferramentas abaixo, **pare e chame agora**.

### 1. Buscar documentação atualizada (sempre)

```bash
node skills/tray-dev/scripts/search_docs.mjs --topic=variacoes "<termo da pergunta>"
```

- `<TOPIC_SLUG>`: ver tabela em `skills/tray-dev/SKILL.md`.
- Use os trechos retornados como fonte primária; este SKILL.md é resumo.

### 2. Validar payload localmente (antes de retornar código)

```bash
node skills/variacoes/scripts/validate.mjs --schema=<SCHEMA_NAME> '<payload_json>'
```

- Schemas disponíveis: `variacao.create`, `variacao.update`. Use `--list-schemas` para confirmar.
- Exit codes: `0` válido · `1` inválido · `2` erro de uso.
- Para output programático: `--json`.
- Corrija todos os erros antes de retornar o código (até 3 tentativas).

## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada.
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta para o recurso (leia `when_not_to_use` no frontmatter).

# API de Variações de Produtos — Tray

Documentação oficial: https://developers.tray.com.br/#apis-de-variacao-de-produtos

## Endpoints

| Método | Endpoint | Descrição |
|:--|:--|:--|
| GET | `/variants` | Listagem de variações com paginação |
| GET | `/variants/:id` | Consultar dados de uma variação |
| POST | `/variants` | Cadastrar nova variação |
| PUT | `/variants/:id` | Atualizar dados da variação |
| DELETE | `/variants/:id` | Excluir variação |

**Autenticação:** `?access_token={token}`

## Campos da Variação

| Campo | Tipo | Descrição |
|:--|:--|:--|
| `product_id` | number | ID do produto pai (obrigatório na criação) |
| `ean` | string | Código de barras da variação |
| `price` | decimal | Preço da variação (herda do produto se não informado) |
| `cost_price` | decimal | Preço de custo |
| `stock` | number | Estoque da variação |
| `weight` | number | Peso em gramas |
| `length` | number | Comprimento |
| `width` | number | Largura |
| `height` | number | Altura |
| `reference` | string | Referência interna da variação |
| `values` | array | Atributos da variação (ex: cor, tamanho) |

## Herança de Dados

Quando um campo não é informado na variação, ele herda o valor do produto pai. Isso se aplica a: `price`, `weight`, `length`, `width`, `height`.

## Limitação de Variações por Produto

A plataforma Tray impõe um limite de variações por produto. Consulte a seção "Limitação de variações por produto" na documentação oficial para os limites atuais.

## Corpo da Requisição (POST/PUT)

```json
{
  "Variant": {
    "product_id": 123,
    "ean": "7891234567890",
    "price": "89.90",
    "stock": 50,
    "values": [
      {"name": "Cor", "value": "Azul"},
      {"name": "Tamanho", "value": "M"}
    ]
  }
}
```

## Paginação

Mesmos parâmetros da API de Produtos: `limit` (máximo 50, padrão 30), `page`.

## Imagens de Variação

As imagens de variação são gerenciadas pela API de Imagens separada (`POST /variants/:id/images`). Consulte o skill `tray-imagens-produtos`.

## Como Usar no Claude Code

### Exemplos de Prompt

- "adiciona variações de tamanho e cor ao produto 456"
- "atualiza o estoque da variação tamanho M cor azul"
- "lista todas as variações do produto 123"
- "como crio variações com preço e estoque individuais?"

### O que o Claude faz

1. Gera o código com o wrapper `Variant` e o `product_id` do produto pai
2. Monta o array `values` com os atributos (cor, tamanho, modelo, etc.)
3. Define campos individuais da variação (preço, estoque, EAN) quando necessário
4. Explica a herança de dados do produto pai para campos não informados

### O que você recebe

- Código de criação de variação com wrapper `{"Variant": {...}}` correto
- Array `values` montado com os atributos desejados
- Lógica de herança explicada (quais campos herdam do produto pai)
- Exemplo de listagem por `product_id`

### Pré-requisitos

- Produto pai já cadastrado com o `product_id` disponível
- `access_token` configurado
