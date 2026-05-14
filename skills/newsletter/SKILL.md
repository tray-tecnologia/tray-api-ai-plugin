---
name: tray-newsletter
description: >
  API de Newsletter da Tray. Utilize quando o desenvolvedor precisar
  gerenciar assinaturas de newsletter da loja, incluindo listagem de assinantes,
  inscrição e confirmação de cadastro.
when_to_use: >
  Use quando o desenvolvedor mencionar: newsletter, assinatura de e-mail, opt-in,
  GET /newsletters, POST /newsletters, lista de e-mails, inscrever cliente na newsletter
  ou gerenciar assinantes.
when_not_to_use: >
  Não use para dados cadastrais do cliente (use tray-clientes). Use apenas para
  inscrição ou listagem de e-mails da newsletter da loja.
---

## MANDATORY: Tool Call Required Before Answering

> **Esta chamada é OBRIGATÓRIA, não opcional.** Execute-a antes de gerar
> qualquer código ou payload. Se você está respondendo sem ter chamado a
> ferramenta abaixo, **pare e chame agora**.

### Buscar documentação atualizada (sempre)

```bash
node skills/tray-dev/scripts/search_docs.mjs --topic=newsletter "<termo da pergunta>"
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

# API de Newsletter — Tray

Documentação oficial: https://developers.tray.com.br/#apis-de-newsletter

## Endpoints

| Método | Endpoint | Descrição |
|:--|:--|:--|
| GET | `/newsletters` | Listagem de assinantes da newsletter |
| POST | `/newsletters` | Cadastrar assinante |
| POST | `/newsletters/confirm` | Confirmar cadastro de newsletter |

**Autenticação:** `?access_token={token}`

## Exemplo de Inscrição

```json
{
  "Newsletter": {
    "email": "cliente@exemplo.com",
    "name": "João Silva"
  }
}
```

## Fluxo de Inscrição

1. `POST /newsletters` — cadastra o e-mail
2. `POST /newsletters/confirm` — confirma a inscrição (double opt-in)

## Paginação

`limit` (máximo 50, padrão 30), `page`.

## Boas Práticas

1. **LGPD** — obtenha consentimento explícito antes de inscrever
2. **Double opt-in** — use o endpoint de confirmação para validar o e-mail

## Como Usar no Claude Code

### Exemplos de Prompt

- "inscreve um cliente na newsletter com double opt-in"
- "lista todos os assinantes da newsletter da loja"
- "implementa o fluxo completo de inscrição com confirmação por e-mail"

### O que o Claude faz

1. Gera o código de inscrição com wrapper `Newsletter` (nome + e-mail)
2. Gera o código de confirmação via `POST /newsletters/confirm`
3. Explica o fluxo double opt-in e a obrigatoriedade de consentimento (LGPD)

### O que você recebe

- Código de inscrição com `{"Newsletter": {"email": "...", "name": "..."}}`
- Código de confirmação double opt-in
- Listagem de assinantes com paginação

### Pré-requisitos

- `access_token` configurado
- Consentimento explícito do usuário (LGPD)
