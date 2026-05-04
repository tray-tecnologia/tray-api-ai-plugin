---
name: tray-etiquetas-hub
description: >
  API de Etiquetas do HUB da Tray. Utilize quando o desenvolvedor
  precisar criar ou consultar etiquetas de envio através do sistema HUB
  de integração logística da Tray.
when_to_use: >
  Use quando o desenvolvedor mencionar: etiqueta HUB, hub label, etiqueta de envio HUB,
  POST /orders/:id/labels/hub, integração logística HUB, rastreio HUB ou gerar etiqueta HUB.
when_not_to_use: >
  Não use para etiquetas de sistemas externos (use tray-emissores-etiqueta) nem para
  etiquetas do Mercado Livre (use tray-etiquetas-mercado-livre).
---

## MANDATORY: Tool Call Required Before Answering

> **Esta chamada é OBRIGATÓRIA, não opcional.** Execute-a antes de gerar
> qualquer código ou payload. Se você está respondendo sem ter chamado a
> ferramenta abaixo, **pare e chame agora**.

### Buscar documentação atualizada (sempre)

```bash
node skills/tray-dev/scripts/search_docs.mjs --topic=etiquetas-hub "<termo da pergunta>"
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

# API de Etiquetas do HUB — Tray

Documentação oficial: https://developers.tray.com.br/#api-de-etiquetas-do-hub

## Endpoints

| Método | Endpoint | Descrição |
|:--|:--|:--|
| POST | `/labels` | Criar etiquetas |
| GET | `/labels` | Consultar etiquetas |

**Autenticação:** `?access_token={token}`

## Criação de Etiquetas

```http
POST /labels?access_token={token}
Content-Type: application/json

{
  "Label": {
    "order_id": 12345
  }
}
```

## Consulta de Etiquetas

```http
GET /labels?access_token={token}&order_id=12345
```

## Observação

O sistema HUB é a integração logística interna da Tray para geração centralizada de etiquetas de envio.

## Como Usar no Claude Code

### Exemplos de Prompt

- "gera a etiqueta de envio para o pedido 12345 via HUB da Tray"
- "consulta as etiquetas geradas para o pedido 12345"
- "implementa a geração automática de etiquetas após confirmação de pagamento"

### O que o Claude faz

1. Gera o código de criação de etiqueta com `POST /labels` e o `order_id`
2. Gera o código de consulta com `GET /labels?order_id=...`
3. Orienta sobre o funcionamento do sistema HUB da Tray

### O que você recebe

- Código de criação de etiqueta com wrapper `{"Label": {"order_id": ...}}`
- Código de consulta por pedido
- Orientação sobre integração com o fluxo de pedidos

### Pré-requisitos

- `access_token` configurado
- Loja com HUB logístico ativo na Tray
- `order_id` do pedido com pagamento confirmado
