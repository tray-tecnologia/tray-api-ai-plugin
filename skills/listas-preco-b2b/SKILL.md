---
name: tray-listas-preco-b2b
description: >
  API de Lista de Preço B2B da Tray. Utilize quando o desenvolvedor
  precisar gerenciar tabelas de preço diferenciadas para clientes B2B e atacado,
  incluindo criação de listas, gestão de valores por produto/variação.
when_not_to_use: >
  Não use para cupons de desconto por código (use tray-cupons). Use para preços
  diferenciados permanentes por grupo ou segmento de cliente.
---

## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada.
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta para o recurso (leia `when_not_to_use` no frontmatter).

# API de Lista de Preço B2B — Tray

Documentação oficial: https://developers.tray.com.br/#api-de-lista-de-preco-b2b

## Endpoints de Listas de Preço

| Método | Endpoint | Descrição |
|:--|:--|:--|
| GET | `/price-lists` | Listar todas as listas de preço |
| GET | `/price-lists/:id` | Retorna uma lista de preço |
| POST | `/price-lists` | Criar lista de preço |
| PUT | `/price-lists/:id` | Atualizar lista de preço |
| DELETE | `/price-lists/:id` | Excluir lista de preço |

## Endpoints de Valores

| Método | Endpoint | Descrição |
|:--|:--|:--|
| GET | `/price-lists/:id/values` | Listar valores de uma lista |
| GET | `/price-lists/:id/values/:value_id` | Retorna um valor |
| POST | `/price-lists/:id/values` | Criar valor na lista |
| PUT | `/price-lists/:id/values/:value_id` | Atualizar valor |
| DELETE | `/price-lists/:id/values/:value_id` | Excluir valor |

**Autenticação:** `?access_token={token}`

## Campos da Lista de Preço

| Campo | Tipo | Descrição |
|:--|:--|:--|
| `name` | string | Nome da lista de preço |
| `description` | string | Descrição |
| `active` | boolean | Se a lista está ativa |
| `customer_group_id` | number | ID do grupo de clientes associado |

## Campos do Valor

| Campo | Tipo | Descrição |
|:--|:--|:--|
| `product_id` | number | ID do produto |
| `variant_id` | number | ID da variação (opcional) |
| `price` | decimal | Preço diferenciado |
| `cost_price` | decimal | Preço de custo |
| `active` | boolean | Se o valor está ativo |

## Exemplo de Criação

```json
{
  "PriceList": {
    "name": "Atacado Premium",
    "description": "Preços para clientes atacadistas",
    "active": 1
  }
}
```

## Exemplo de Valor

```json
{
  "PriceListValue": {
    "product_id": 123,
    "price": "79.90",
    "active": 1
  }
}
```

## Paginação

`limit` (máximo 50, padrão 30), `page`.

## Como Usar no Claude Code

### Exemplos de Prompt

- "cria uma lista de preço Atacado Premium com preços específicos por produto"
- "adiciona o produto 123 com preço R$ 79,90 à lista de preço ID 5"
- "lista todas as listas de preço B2B disponíveis"
- "implementa preços diferenciados para clientes atacadistas"

### O que o Claude faz

1. Gera o código de criação da lista com wrapper `PriceList`
2. Gera o código de adição de valores por produto com wrapper `PriceListValue`
3. Explica o fluxo: criar lista → adicionar valores → associar ao perfil de cliente
4. Orienta sobre a combinação com `tray-perfis-cliente` para segmentação B2B

### O que você recebe

- Código de criação de lista de preço com nome e configuração
- Código de adição de valores por `product_id` e `variant_id`
- Fluxo completo de configuração B2B: lista → valores → perfil
- Orientação sobre associação com grupos de clientes

### Pré-requisitos

- `access_token` configurado
- Produtos já cadastrados com `product_id` disponível
- Perfis de cliente configurados via `tray-perfis-cliente` (para associação)
