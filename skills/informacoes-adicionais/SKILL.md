---
name: tray-informacoes-adicionais
description: >
  API de Informação Adicional da Tray. Utilize quando o desenvolvedor
  precisar gerenciar campos customizados de informação que podem ser vinculados
  a produtos, incluindo criação, atualização, vinculação e exclusão.
when_to_use: >
  Use quando o desenvolvedor mencionar: informação adicional, campo customizado,
  additional_info, campo extra de produto, POST /additional_infos,
  vincular informação adicional a produto ou campo personalizado de catálogo.
when_not_to_use: >
  Não use para características com filtro de vitrine (use tray-caracteristicas) nem para
  variações com estoque separado (use tray-variacoes).
---

## MANDATORY: Tool Call Required Before Answering

> **Esta chamada é OBRIGATÓRIA, não opcional.** Execute-a antes de gerar
> qualquer código ou payload. Se você está respondendo sem ter chamado a
> ferramenta abaixo, **pare e chame agora**.

### Buscar documentação atualizada (sempre)

```bash
node skills/tray-dev/scripts/search_docs.mjs --topic=informacoes-adicionais "<termo da pergunta>"
```

- `<TOPIC_SLUG>`: ver tabela em `skills/tray-dev/SKILL.md`.
- Use os trechos retornados como fonte primária; este SKILL.md é resumo.

> **Nota:** este recurso ainda não tem `validate.mjs` local. Você é responsável
> por revisar campos obrigatórios contra a doc retornada e o resumo abaixo.

## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada.
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta para o recurso (leia `when_not_to_use` no frontmatter).

# API de Informação Adicional — Tray

Documentação oficial: https://developers.tray.com.br/#api-de-informacao-adicional-additional_info

## Endpoints

| Método | Endpoint | Descrição |
|:--|:--|:--|
| GET | `/additional-info` | Listagem geral das informações adicionais |
| GET | `/additional-info/:id` | Consultar dados por ID |
| POST | `/additional-info` | Cadastrar informação adicional |
| PUT | `/additional-info/:id` | Atualizar informação |
| PUT | `/products/:id/additional-info` | Atualizar informações relacionadas ao produto |
| POST | `/products/:id/additional-info` | Vincular informação adicional ao produto |
| DELETE | `/products/:id/additional-info/:info_id` | Excluir relação com produto |
| DELETE | `/additional-info/:id` | Excluir informação adicional |

**Autenticação:** `?access_token={token}`

## Exemplo de Criação

```json
{
  "AdditionalInfo": {
    "name": "Composição",
    "value": "100% Algodão"
  }
}
```

## Vinculação com Produto

Para vincular uma informação adicional a um produto:

```http
POST /products/123/additional-info?access_token={token}
```

```json
{
  "additional_info_id": 456
}
```

## Boas Práticas

1. **Crie antes de vincular** — primeiro crie a informação, depois vincule ao produto
2. **Reutilize** — a mesma informação pode ser vinculada a múltiplos produtos
3. **Paginação** — `limit` (máximo 50, padrão 30), `page`

## Como Usar no Claude Code

### Exemplos de Prompt

- "adiciona o campo Composição com valor '100% Algodão' ao produto 123"
- "como crio informações adicionais reutilizáveis para múltiplos produtos?"
- "vincula a informação adicional ID 45 aos produtos 101, 102 e 103"
- "lista todas as informações adicionais cadastradas"

### O que o Claude faz

1. Gera o código de criação da informação com wrapper `AdditionalInfo`
2. Gera o código de vinculação ao produto via `POST /products/:id/additional-info`
3. Explica quando criar nova informação vs. reutilizar uma existente (via ID)
4. Monta o fluxo completo: criar → vincular para múltiplos produtos quando necessário

### O que você recebe

- Código de criação com `{"AdditionalInfo": {"name": "...", "value": "..."}}`
- Código de vinculação com o `additional_info_id` retornado
- Exemplo de reutilização da mesma informação em múltiplos produtos
- Código de exclusão da relação via `DELETE /products/:id/additional-info/:info_id`

### Pré-requisitos

- Produto já cadastrado com `product_id` disponível
- `access_token` configurado
