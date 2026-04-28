---
name: tray-palavras-chave
description: >
  API de Palavras-Chave da Tray. Utilize quando o desenvolvedor precisar
  consultar palavras-chave de SEO associadas à loja. API somente leitura.
when_to_use: >
  Use quando o desenvolvedor mencionar: palavras-chave, SEO, keyword, GET /keywords,
  termos de busca da loja, otimização de busca ou palavras buscadas na vitrine.
when_not_to_use: >
  Não use para SEO de produto — campos metatag/shortcut estão em tray-produtos. API
  somente leitura para consultar keywords configuradas na loja.
---

## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada.
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta para o recurso (leia `when_not_to_use` no frontmatter).

# API de Palavras-Chave — Tray

Documentação oficial: https://developers.tray.com.br/#apis-de-palavras-chave

## Endpoints

| Método | Endpoint | Descrição |
|:--|:--|:--|
| GET | `/keywords` | Listagem de palavras-chave |
| GET | `/keywords/:id` | Consultar dados de uma palavra-chave |

**Autenticação:** `?access_token={token}`

**Somente leitura** — esta API não permite criação, atualização ou exclusão.

## Paginação

`limit` (máximo 50, padrão 30), `page`.

## Uso

Útil para consultar as palavras-chave de SEO configuradas na loja e integrá-las com ferramentas de marketing e analytics.

## Como Usar no Claude Code

### Exemplos de Prompt

- "lista todas as palavras-chave de SEO da loja"
- "consulta as palavras-chave para integrar com minha ferramenta de analytics"

### O que o Claude faz

1. Gera o código para `GET /keywords` com paginação
2. Extrai as palavras-chave para uso em ferramentas externas de SEO/analytics

### O que você recebe

- Código de listagem de palavras-chave com paginação
- Nota de que a API é somente leitura

### Pré-requisitos

- `access_token` configurado
