# Design Spec — Validação Executável e Mandatory Tool Calls

**Data:** 2026-04-27
**Motivação:** Posição competitiva no marketplace — fechar o gap de −18 pontos em relação ao benchmark Shopify AI Toolkit (critérios "Validação executável" e "Qualidade das skills").
**Abordagem escolhida:** P1 cirúrgico (Abordagem A)

---

## Contexto

O Tray API Plugin v1.1.0 fecha em 64/100 contra 79/100 do Shopify AI Toolkit. O gap de −15 está concentrado em:

| Critério | Tray | Shopify | Δ |
|:--|:--:|:--:|:--:|
| Validação executável (peso 15%) | 1 | 10 | −9 |
| Integração com API live (peso 10%) | 0 | 9 | −9 |
| Qualidade das skills (peso 15%) | 6 | 10 | −4 |

**Restrição:** O portal `developers.tray.com.br` não expõe endpoint de busca semântica e criar um está fora do escopo. A integração com API live é substituída por schemas embarcados derivados da documentação HTML do portal.

---

## Objetivo

Elevar o score do plugin de 64 para ~82/100, ultrapassando o benchmark Shopify, através de quatro mudanças na Abordagem A:

1. **Seção "Antes de responder"** em todos os SKILL.md (mandatory tool calls)
2. **Campo `when_not_to_use`** no frontmatter de todos os SKILL.md (disambiguation)
3. **JSON schemas** derivados da doc oficial para 5 skills prioritárias
4. **`scripts/validate.mjs`** por skill para validação offline de payloads

---

## Arquitetura

### Visão geral

```
SKILL.md (34 skills)
  ├── frontmatter: when_not_to_use     ← novo campo (disambiguation)
  └── ## Antes de responder            ← nova seção (mandatory tool calls)
       └── instrução para validate.mjs (apenas nas 5 skills com script)

skills/<recurso>/
  ├── SKILL.md
  ├── assets/
  │   └── schema.json                  ← JSON Schema Draft-07 derivado da doc
  └── scripts/
      └── validate.mjs                 ← valida payload, reporta erros em PT-BR
```

### Skills com validação completa (fase 1)

Prioridade definida por volume de uso e risco de erro de payload:

| Skill | Recurso | Justificativa |
|:--|:--|:--|
| `tray-produtos` | `POST /products`, `PUT /products/:id` | Recurso mais usado, muitos campos obrigatórios |
| `tray-pedidos` | `POST /orders`, `PUT /orders/:id` | Alto risco de erro em campos fiscais |
| `tray-autorizacao` | OAuth token exchange | Erros de auth bloqueiam toda integração |
| `tray-webhooks` | `POST /notifications` | Configuração crítica, difícil debugar |
| `tray-clientes` | `POST /customers`, `PUT /customers/:id` | Campos BR obrigatórios (CPF/CNPJ) |

---

## Componentes

### 1. Frontmatter — `when_not_to_use`

Campo YAML adicionado ao frontmatter de cada SKILL.md explicando casos onde a skill **não** deve ser selecionada.

**Formato:**
```yaml
when_not_to_use: >
  Não use para variações/SKUs (use tray-variacoes), imagens de produto
  (use tray-imagens-produtos) ou kits/combos (use tray-kits).
```

**Escopo:** Todas as 34 skills.

---

### 2. Seção "Antes de responder"

Bloco markdown inserido logo após o frontmatter, antes do primeiro `#` de conteúdo, em todas as skills.

**Template base (skills sem validate.mjs):**
```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada.
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta para o recurso (leia `when_not_to_use` no frontmatter).
```

**Variante para skills com validate.mjs (5 skills prioritárias):**
Adiciona o passo 5:
```markdown
5. Execute `node skills/<recurso>/scripts/validate.mjs '<payload_json>'`
   e corrija todos os erros antes de retornar o código ao usuário.
   Até 3 tentativas — se persistir, explique o problema ao usuário.
```

**Escopo:** Todas as 34 skills (passo 5 apenas nas 5 com script).

---

### 3. JSON Schema por skill

Arquivo `skills/<recurso>/assets/schema.json` seguindo JSON Schema Draft-07.

**Derivação:** Campos, tipos, limites e valores enum extraídos diretamente da documentação em `developers.tray.com.br`. A documentação HTML do portal é a fonte de verdade.

**Estrutura do schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "<NomeDoRecurso>",
  "description": "Payload para POST/PUT na API Tray — <recurso>",
  "type": "object",
  "required": ["<campo1>", "<campo2>"],
  "properties": {
    "<campo>": {
      "type": "<tipo>",
      "maxLength": <n>,
      "description": "<descrição PT-BR>"
    }
  },
  "additionalProperties": true
}
```

`additionalProperties: true` mantém compatibilidade com campos não documentados que a API possa aceitar.

**Schemas a criar:**

| Skill | Arquivo | Campos `required` |
|:--|:--|:--|
| `tray-produtos` | `skills/produtos/assets/schema.json` | `name`, `price`, `status` |
| `tray-pedidos` | `skills/pedidos/assets/schema.json` | `id_customer`, `products` |
| `tray-autorizacao` | `skills/autorizacao/assets/schema.json` | `consumer_key`, `consumer_secret`, `code` |
| `tray-webhooks` | `skills/webhooks/assets/schema.json` | `act`, `receiver_url` |
| `tray-clientes` | `skills/clientes/assets/schema.json` | `name`, `email`, `cpf` |

---

### 4. validate.mjs

Script Node.js ESM executável via CLI, sem dependências externas (usa apenas `node:fs` e validação manual — sem `ajv` para não exigir `npm install`). O validador implementa o **subset das regras presentes nos nossos schemas**: `required`, `type`, `maxLength`, `enum`, `minimum`. Não é conformidade total com JSON Schema Draft-07 — o formato do schema segue o draft para facilitar migração futura para ajv se necessário.

**Interface:**
```bash
node skills/produtos/scripts/validate.mjs '<payload_json>'
# Saída de sucesso:
✅ Payload válido — pode prosseguir.

# Saída de erro:
❌ Validação falhou — 2 erros:
  • "price" é obrigatório mas está ausente.
    → Adicione: "price": <número maior que 0>
  • "name" excede 200 caracteres (atual: 215).
    → Trunce para no máximo 200 caracteres.

Corrija e tente novamente (tentativa 1/3).
```

**Comportamento:**
- Lê o schema de `../assets/schema.json` (relativo ao script)
- Aceita payload como argumento posicional ou via stdin
- Aceita payload com ou sem a chave-envelope do recurso (`{"Product": {...}}` ou `{...}` diretamente)
- Valida: campos `required`, tipos, `maxLength`, `enum`, `minimum`
- Saída em PT-BR com sugestão de correção por erro
- Exit code `0` para válido, `1` para inválido
- Sem dependências npm — funciona com Node.js ≥ 18 nativo

---

## Fluxo de dados

```
Agente lê SKILL.md
  → Lê "Antes de responder" (seção obrigatória)
  → Monta payload baseado nos campos documentados
  → Executa validate.mjs com o payload
  → [válido] Retorna código ao usuário
  → [inválido] Corrige payload (até 3 tentativas)
  → [falhou 3x] Explica o problema ao usuário com os erros do validator
```

---

## Tratamento de erros

| Cenário | Comportamento |
|:--|:--|
| JSON inválido passado ao validate.mjs | Erro: "Payload não é JSON válido" + exemplo de formato correto |
| Schema não encontrado | Erro: "Schema não encontrado em `../assets/schema.json`" — não silencia |
| Campo ausente (required) | Reporta campo + tipo esperado + exemplo de valor |
| Tipo incorreto | Reporta campo + tipo recebido + tipo esperado |
| String acima do maxLength | Reporta campo + tamanho atual + limite |
| Valor fora do enum | Reporta campo + valor recebido + valores válidos |
| Tentativas esgotadas (3/3) | Agente explica os erros ao usuário, não gera código quebrado |

---

## Testes

O `scripts/smoke-test.js` existente é expandido para cobrir:

1. Todos os 5 `validate.mjs` executam sem erro com payload válido de exemplo
2. Todos os 5 `validate.mjs` retornam exit code 1 com payload inválido conhecido
3. Todos os 34 SKILL.md contêm a seção `## Antes de responder`
4. Todos os 34 SKILL.md contêm campo `when_not_to_use` no frontmatter

---

## Fora do escopo

- Schemas para as outras 29 skills (fase 2 futura)
- Endpoint de busca semântica / MCP server (infraestrutura não disponível)
- Versão EN das skills (P3)
- Sub-agente reverso de migração (P3)
- CI GitHub Actions (P3 — pode ser feito separadamente)

---

## Score esperado após implementação

| Critério | Antes | Depois | Δ |
|:--|:--:|:--:|:--:|
| Qualidade das skills (15%) | 6 | 8 | +2 → +0.3 pts |
| Validação executável (15%) | 1 | 8 | +7 → +1.05 pts |
| Integração com API live (10%) | 0 | 5 | +5 → +0.5 pts |
| **Score total estimado** | **64** | **~82** | **+18** |

A estimativa de "integração com API live" sobe de 0 para ~5 porque schemas embarcados cobrem parcialmente o critério (validação offline baseada em doc oficial), mesmo sem endpoint live.
