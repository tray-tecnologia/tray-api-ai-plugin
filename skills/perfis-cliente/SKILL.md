---
name: tray-perfis-cliente
description: >
  API de Perfis de Clientes da Tray. Utilize quando o desenvolvedor precisar
  gerenciar perfis (grupos/segmentos) de clientes da loja, incluindo criação, consulta,
  atualização, exclusão e associação/desassociação de clientes a perfis. Útil para
  segmentação de clientes, preços diferenciados (B2B/B2C) e regras de desconto por grupo.
when_to_use: >
  Use quando o desenvolvedor mencionar: perfil de cliente, grupo de clientes, segmento,
  customer profile, GET /customer_profiles, POST /customer_profiles, B2B vs B2C,
  associar cliente a perfil ou desconto por grupo de clientes.
when_not_to_use: >
  Não use para dados cadastrais do cliente (use tray-clientes) nem para listas de preço
  B2B (use tray-listas-preco-b2b).
---

## MANDATORY: Tool Call Required Before Answering

> **Esta chamada é OBRIGATÓRIA, não opcional.** Execute-a antes de gerar
> qualquer código ou payload. Se você está respondendo sem ter chamado a
> ferramenta abaixo, **pare e chame agora**.

### Buscar documentação atualizada (sempre)

```bash
node skills/tray-dev/scripts/search_docs.mjs --topic=clientes "<termo da pergunta>"
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

# API de Perfis de Clientes — Tray

Documentação oficial: https://developers.tray.com.br/#api-de-clientes

## Endpoints

| Método | Endpoint | Descrição |
|:--|:--|:--|
| GET | `/customers/profiles` | Listar perfis de clientes |
| GET | `/customers/profiles/:id` | Consultar dados de um perfil por ID |
| POST | `/customers/profiles` | Cadastrar novo perfil |
| PUT | `/customers/profiles/:id` | Atualizar dados do perfil |
| DELETE | `/customers/profiles/:id` | Excluir perfil |
| POST | `/customers/:customer_id/profiles/:profile_id` | Associar cliente a um perfil |
| DELETE | `/customers/:customer_id/profiles/:profile_id` | Desassociar cliente de um perfil |

**Autenticação:** `?access_token={token}` em todas as chamadas.

## Campos do Perfil

| Campo | Tipo | Obrigatório | Descrição |
|:--|:--|:--|:--|
| `id` | number | — | ID do perfil (retornado pela API) |
| `name` | string | Sim | Nome do perfil (ex: "Atacado", "VIP", "Revendedor") |
| `description` | string | Não | Descrição do perfil |
| `approved` | number | Não | 1 = perfil ativo/aprovado, 0 = inativo |

## Paginação

| Parâmetro | Descrição |
|:--|:--|
| `limit` | Itens por página (máximo **50**, padrão **30**) |
| `page` | Número da página |

## Corpo da Requisição — Criar/Atualizar Perfil (POST/PUT)

```json
{
  "Profile": {
    "name": "Atacado",
    "description": "Clientes com volume de compra acima de R$ 5.000/mês",
    "approved": 1
  }
}
```

## Associar Cliente a Perfil

**Endpoint:** `POST /customers/:customer_id/profiles/:profile_id`

Não requer corpo na requisição. O cliente é associado ao perfil informado na URL.

**Exemplo:**
```
POST /customers/50/profiles/3?access_token={token}
```

## Desassociar Cliente de Perfil

**Endpoint:** `DELETE /customers/:customer_id/profiles/:profile_id`

Remove a associação entre o cliente e o perfil.

**Exemplo:**
```
DELETE /customers/50/profiles/3?access_token={token}
```

## Respostas

| Operação | Código | Mensagem |
|:--|:--|:--|
| Criação de perfil | 201 | `{"message": "Created", "id": 3, "code": 201}` |
| Atualização de perfil | 200 | `{"message": "Saved", "id": 3, "code": 200}` |
| Exclusão de perfil | 200 | `{"message": "Deleted", "id": 3, "code": 200}` |
| Associação | 200 | `{"message": "Saved", "code": 200}` |
| Desassociação | 200 | `{"message": "Deleted", "code": 200}` |

## Exemplo de Resposta — Listar Perfis

```json
{
  "Profiles": [
    {
      "Profile": {
        "id": "1",
        "name": "Varejo",
        "description": "Clientes do segmento varejo",
        "approved": "1"
      }
    },
    {
      "Profile": {
        "id": "2",
        "name": "Atacado",
        "description": "Clientes com volume de compra elevado",
        "approved": "1"
      }
    }
  ]
}
```

## Casos de Uso

- **B2B/B2C** — crie perfis "Pessoa Física" e "Pessoa Jurídica" para aplicar regras diferentes
- **Listas de Preço** — associe perfis a listas de preço diferenciadas (consulte o skill `tray-listas-preco-b2b`)
- **Descontos por grupo** — configure descontos automáticos baseados no perfil do cliente
- **Aprovação manual** — use o campo `approved` para controlar a ativação de perfis que requerem aprovação

## Boas Práticas

1. **Nomes descritivos** — use nomes claros para facilitar a gestão (ex: "Atacado - Gold", "Revendedor Autorizado")
2. **Perfil antes do cliente** — crie o perfil antes de associar clientes a ele
3. **Um cliente, múltiplos perfis** — um cliente pode pertencer a vários perfis simultaneamente
4. **Não exclua perfis em uso** — verifique se há clientes associados antes de excluir um perfil
5. **Integração com preços** — combine perfis com listas de preço B2B para oferecer preços diferenciados
6. **Recursos relacionados** — consulte os skills `tray-clientes` e `tray-listas-preco-b2b` para operações complementares

## Como Usar no Claude Code

### Exemplos de Prompt

- "cria os perfis Atacado e Varejo e associa o cliente 50 ao perfil Atacado"
- "lista todos os perfis de cliente disponíveis na loja"
- "implementa segmentação B2B/B2C com perfis e preços diferenciados"
- "remove o cliente 50 do perfil Varejo e migra para Atacado"

### O que o Claude faz

1. Gera o código de criação de perfil com wrapper `Profile`
2. Gera o código de associação e desassociação (sem body, apenas IDs na URL)
3. Explica a combinação com `tray-listas-preco-b2b` para preços diferenciados
4. Demonstra o fluxo completo de segmentação B2B

### O que você recebe

- Código de criação de perfil com nome e descrição
- Código de associação: `POST /customers/:id/profiles/:profile_id`
- Código de desassociação: `DELETE /customers/:id/profiles/:profile_id`
- Orientação sobre combinação com listas de preço B2B

### Pré-requisitos

- `access_token` configurado
- Clientes já cadastrados com `customer_id` disponível via `tray-clientes`
