# Validação Executável e Mandatory Tool Calls — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o gap de −18 pontos vs benchmark Shopify AI Toolkit adicionando schemas JSON, scripts de validação offline e mandatory tool calls em todas as 34 skills.

**Architecture:** Biblioteca de validação compartilhada em `scripts/lib/validate-schema.mjs` consumida por scripts `validate.mjs` individuais em cada uma das 5 skills prioritárias. Todas as 34 skills recebem `when_not_to_use` no frontmatter e seção `## Antes de responder`. O `smoke-test.js` existente é expandido para garantir que os novos artefatos estejam presentes.

**Tech Stack:** Node.js ≥ 18 ESM nativo, sem dependências npm. JSON Schema Draft-07 como formato de schema (subset validado manualmente).

---

## Mapa de arquivos

| Ação | Arquivo |
|:--|:--|
| Criar | `scripts/lib/validate-schema.mjs` |
| Criar | `skills/produtos/assets/schema.json` |
| Criar | `skills/produtos/scripts/validate.mjs` |
| Criar | `skills/pedidos/assets/schema.json` |
| Criar | `skills/pedidos/scripts/validate.mjs` |
| Criar | `skills/autorizacao/assets/schema.json` |
| Criar | `skills/autorizacao/scripts/validate.mjs` |
| Criar | `skills/webhooks/assets/schema.json` |
| Criar | `skills/webhooks/scripts/validate.mjs` |
| Criar | `skills/clientes/assets/schema.json` |
| Criar | `skills/clientes/scripts/validate.mjs` |
| Modificar | `skills/*/SKILL.md` (34 arquivos) |
| Modificar | `scripts/smoke-test.js` |

---

## Task 1: Biblioteca de validação compartilhada

**Files:**
- Create: `scripts/lib/validate-schema.mjs`

- [ ] **Step 1: Criar `scripts/lib/validate-schema.mjs`**

```js
// scripts/lib/validate-schema.mjs

/**
 * Valida um payload contra um subset de JSON Schema Draft-07.
 * Regras suportadas: required, type, maxLength, minimum, enum.
 * Retorna array de erros (vazio = payload válido).
 *
 * @param {object} schema  JSON Schema Draft-07 (subset)
 * @param {object} payload Objeto a validar
 * @returns {{ field: string, message: string, suggestion: string }[]}
 */
export function validatePayload(schema, payload) {
  const errors = [];

  if (schema.required) {
    for (const field of schema.required) {
      if (payload[field] === undefined || payload[field] === null) {
        errors.push({
          field,
          message: `"${field}" é obrigatório mas está ausente.`,
          suggestion: `Adicione: "${field}": ${suggestValue(schema.properties?.[field])}`,
        });
      }
    }
  }

  if (schema.properties) {
    for (const [field, def] of Object.entries(schema.properties)) {
      const value = payload[field];
      if (value === undefined || value === null) continue;

      if (def.type && !checkType(value, def.type)) {
        errors.push({
          field,
          message: `"${field}" deve ser do tipo ${def.type}, recebeu ${typeof value}.`,
          suggestion: `Converta para ${def.type}.`,
        });
        continue;
      }

      if (def.maxLength && typeof value === 'string' && value.length > def.maxLength) {
        errors.push({
          field,
          message: `"${field}" excede ${def.maxLength} caracteres (atual: ${value.length}).`,
          suggestion: `Trunce para no máximo ${def.maxLength} caracteres.`,
        });
      }

      if (def.minimum !== undefined && typeof value === 'number' && value < def.minimum) {
        errors.push({
          field,
          message: `"${field}" deve ser no mínimo ${def.minimum} (atual: ${value}).`,
          suggestion: `Use um valor >= ${def.minimum}.`,
        });
      }

      if (def.enum && !def.enum.includes(value)) {
        errors.push({
          field,
          message: `"${field}" tem valor inválido: ${JSON.stringify(value)}.`,
          suggestion: `Valores válidos: ${def.enum.map((v) => JSON.stringify(v)).join(', ')}.`,
        });
      }
    }
  }

  return errors;
}

function checkType(value, type) {
  switch (type) {
    case 'string':  return typeof value === 'string';
    case 'number':  return typeof value === 'number';
    case 'integer': return Number.isInteger(value);
    case 'boolean': return typeof value === 'boolean';
    case 'array':   return Array.isArray(value);
    case 'object':  return typeof value === 'object' && !Array.isArray(value) && value !== null;
    default:        return true;
  }
}

function suggestValue(def) {
  if (!def) return '<valor>';
  switch (def.type) {
    case 'string':  return '"<texto>"';
    case 'number':  return '<número>';
    case 'integer': return '<inteiro>';
    case 'boolean': return 'true';
    case 'array':   return '[]';
    default:        return '<valor>';
  }
}
```

- [ ] **Step 2: Testar a lib diretamente no Node.js REPL**

```bash
node --input-type=module <<'EOF'
import { validatePayload } from './scripts/lib/validate-schema.mjs';

const schema = {
  required: ['name', 'price'],
  properties: {
    name:   { type: 'string', maxLength: 5 },
    price:  { type: 'number', minimum: 0 },
    status: { type: 'integer', enum: [0, 1] },
  },
};

// caso 1: válido
const e1 = validatePayload(schema, { name: 'Tênis', price: 99.9, status: 1 });
console.assert(e1.length === 0, 'caso 1 deveria passar');

// caso 2: campo required ausente
const e2 = validatePayload(schema, { price: 10 });
console.assert(e2.length === 1 && e2[0].field === 'name', 'caso 2: name ausente');

// caso 3: maxLength violado
const e3 = validatePayload(schema, { name: 'Nome muito longo', price: 10 });
console.assert(e3.length === 1 && e3[0].field === 'name', 'caso 3: maxLength');

// caso 4: enum inválido
const e4 = validatePayload(schema, { name: 'Ok', price: 10, status: 5 });
console.assert(e4.length === 1 && e4[0].field === 'status', 'caso 4: enum');

console.log('✅ Todos os casos passaram');
EOF
```

Saída esperada: `✅ Todos os casos passaram`

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/validate-schema.mjs
git commit -m "feat: add shared validate-schema lib"
```

---

## Task 2: Schema + validate.mjs — tray-produtos

**Files:**
- Create: `skills/produtos/assets/schema.json`
- Create: `skills/produtos/scripts/validate.mjs`

- [ ] **Step 1: Criar `skills/produtos/assets/schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Product",
  "description": "Payload para POST /products e PUT /products/:id na API Tray",
  "type": "object",
  "required": ["name", "price", "status"],
  "properties": {
    "name":                { "type": "string",  "maxLength": 200, "description": "Nome do produto" },
    "price":               { "type": "number",  "minimum": 0,     "description": "Preço de venda" },
    "status":              { "type": "integer", "enum": [0, 1],   "description": "0=inativo, 1=ativo" },
    "ean":                 { "type": "string",  "maxLength": 120, "description": "Código de barras EAN" },
    "ncm":                 { "type": "string",  "maxLength": 8,   "description": "Classificação fiscal NCM" },
    "description":         { "type": "string",  "maxLength": 4800,"description": "Descrição completa" },
    "description_small":   { "type": "string",  "maxLength": 500, "description": "Descrição curta" },
    "reference":           { "type": "string",  "maxLength": 120, "description": "Referência interna" },
    "cost_price":          { "type": "number",  "minimum": 0,     "description": "Preço de custo" },
    "promotional_price":   { "type": "number",  "minimum": 0,     "description": "Preço promocional" },
    "weight":              { "type": "number",  "minimum": 0,     "description": "Peso em gramas" },
    "length":              { "type": "number",  "minimum": 0,     "description": "Comprimento em cm" },
    "width":               { "type": "number",  "minimum": 0,     "description": "Largura em cm" },
    "height":              { "type": "number",  "minimum": 0,     "description": "Altura em cm" },
    "stock":               { "type": "integer", "minimum": 0,     "description": "Estoque disponível" },
    "brand_id":            { "type": "integer", "minimum": 1,     "description": "ID da marca" },
    "category_id":         { "type": "integer", "minimum": 1,     "description": "ID da categoria" }
  },
  "additionalProperties": true
}
```

- [ ] **Step 2: Criar `skills/produtos/scripts/validate.mjs`**

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePayload } from '../../../scripts/lib/validate-schema.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dir, '../assets/schema.json');
const RESOURCE_KEY = 'Product';

const rawArg = process.argv[2] ?? await readStdin();

let payload;
try {
  const parsed = JSON.parse(rawArg);
  payload = parsed[RESOURCE_KEY] ?? parsed;
} catch {
  console.error('❌ Payload não é JSON válido.');
  console.error(`   Formato esperado: '{"${RESOURCE_KEY}": {...}}' ou '{...}'`);
  process.exit(1);
}

let schema;
try {
  schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
} catch {
  console.error(`❌ Schema não encontrado em ${SCHEMA_PATH}`);
  process.exit(1);
}

const errors = validatePayload(schema, payload);

if (errors.length === 0) {
  console.log('✅ Payload válido — pode prosseguir.');
  process.exit(0);
} else {
  const attempt = process.env.VALIDATE_ATTEMPT ?? 1;
  console.error(`❌ Validação falhou — ${errors.length} erro${errors.length > 1 ? 's' : ''}:`);
  for (const e of errors) {
    console.error(`  • ${e.message}`);
    console.error(`    → ${e.suggestion}`);
  }
  console.error(`\nCorrija e tente novamente (tentativa ${attempt}/3).`);
  process.exit(1);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8').trim();
}
```

- [ ] **Step 3: Testar payload válido**

```bash
node skills/produtos/scripts/validate.mjs '{"Product":{"name":"Tênis Branco","price":99.90,"status":1}}'
```

Saída esperada: `✅ Payload válido — pode prosseguir.`

- [ ] **Step 4: Testar payload inválido**

```bash
node skills/produtos/scripts/validate.mjs '{"Product":{"price":99.90}}'
```

Saída esperada (exit code 1):
```
❌ Validação falhou — 1 erro:
  • "name" é obrigatório mas está ausente.
    → Adicione: "name": "<texto>"
```

- [ ] **Step 5: Commit**

```bash
git add skills/produtos/assets/schema.json skills/produtos/scripts/validate.mjs
git commit -m "feat(produtos): add JSON schema and validate.mjs"
```

---

## Task 3: Schema + validate.mjs — tray-pedidos

**Files:**
- Create: `skills/pedidos/assets/schema.json`
- Create: `skills/pedidos/scripts/validate.mjs`

- [ ] **Step 1: Criar `skills/pedidos/assets/schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Order",
  "description": "Payload para POST /orders e PUT /orders/:id na API Tray",
  "type": "object",
  "required": ["client_id"],
  "properties": {
    "client_id":       { "type": "integer", "minimum": 1,   "description": "ID do cliente (obrigatório)" },
    "status_id":       { "type": "integer", "minimum": 1,   "description": "ID do status do pedido" },
    "total_amount":    { "type": "number",  "minimum": 0,   "description": "Valor total do pedido" },
    "shipping_cost":   { "type": "number",  "minimum": 0,   "description": "Custo do frete" },
    "shipping_method": { "type": "string",  "maxLength": 200,"description": "Método de envio" },
    "discount":        { "type": "number",  "minimum": 0,   "description": "Valor de desconto" },
    "coupon_code":     { "type": "string",  "maxLength": 50, "description": "Código do cupom aplicado" },
    "tracking_number": { "type": "string",  "maxLength": 200,"description": "Código de rastreamento" },
    "payment_method":  { "type": "string",  "maxLength": 100,"description": "Método de pagamento" }
  },
  "additionalProperties": true
}
```

- [ ] **Step 2: Criar `skills/pedidos/scripts/validate.mjs`**

Mesmo conteúdo do validate.mjs de produtos, substituindo `RESOURCE_KEY = 'Product'` por:

```js
const RESOURCE_KEY = 'Order';
```

E o caminho do schema:
```js
const SCHEMA_PATH = join(__dir, '../assets/schema.json');
```

Arquivo completo:

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePayload } from '../../../scripts/lib/validate-schema.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dir, '../assets/schema.json');
const RESOURCE_KEY = 'Order';

const rawArg = process.argv[2] ?? await readStdin();

let payload;
try {
  const parsed = JSON.parse(rawArg);
  payload = parsed[RESOURCE_KEY] ?? parsed;
} catch {
  console.error('❌ Payload não é JSON válido.');
  console.error(`   Formato esperado: '{"${RESOURCE_KEY}": {...}}' ou '{...}'`);
  process.exit(1);
}

let schema;
try {
  schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
} catch {
  console.error(`❌ Schema não encontrado em ${SCHEMA_PATH}`);
  process.exit(1);
}

const errors = validatePayload(schema, payload);

if (errors.length === 0) {
  console.log('✅ Payload válido — pode prosseguir.');
  process.exit(0);
} else {
  const attempt = process.env.VALIDATE_ATTEMPT ?? 1;
  console.error(`❌ Validação falhou — ${errors.length} erro${errors.length > 1 ? 's' : ''}:`);
  for (const e of errors) {
    console.error(`  • ${e.message}`);
    console.error(`    → ${e.suggestion}`);
  }
  console.error(`\nCorrija e tente novamente (tentativa ${attempt}/3).`);
  process.exit(1);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8').trim();
}
```

- [ ] **Step 3: Testar payload válido**

```bash
node skills/pedidos/scripts/validate.mjs '{"Order":{"client_id":123,"status_id":1}}'
```

Saída esperada: `✅ Payload válido — pode prosseguir.`

- [ ] **Step 4: Testar payload inválido**

```bash
node skills/pedidos/scripts/validate.mjs '{"Order":{"status_id":1}}'
```

Saída esperada (exit code 1):
```
❌ Validação falhou — 1 erro:
  • "client_id" é obrigatório mas está ausente.
    → Adicione: "client_id": <inteiro>
```

- [ ] **Step 5: Commit**

```bash
git add skills/pedidos/assets/schema.json skills/pedidos/scripts/validate.mjs
git commit -m "feat(pedidos): add JSON schema and validate.mjs"
```

---

## Task 4: Schema + validate.mjs — tray-autorizacao

**Files:**
- Create: `skills/autorizacao/assets/schema.json`
- Create: `skills/autorizacao/scripts/validate.mjs`

- [ ] **Step 1: Criar `skills/autorizacao/assets/schema.json`**

Cobre o body de `POST /auth` (Etapa 3 do OAuth — geração de tokens):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AuthRequest",
  "description": "Payload para POST /auth — geração de access_token e refresh_token",
  "type": "object",
  "required": ["consumer_key", "consumer_secret", "code"],
  "properties": {
    "consumer_key":    { "type": "string", "description": "Chave do aplicativo (obtida na criação do app)" },
    "consumer_secret": { "type": "string", "description": "Segredo do aplicativo" },
    "code":            { "type": "string", "description": "Código de autorização recebido no callback (uso único)" }
  },
  "additionalProperties": false
}
```

> `additionalProperties: false` aqui porque o endpoint `/auth` aceita exatamente esses 3 campos.

- [ ] **Step 2: Criar `skills/autorizacao/scripts/validate.mjs`**

Sem chave-envelope (o body de `/auth` não usa envelope `{"Auth": {...}}`):

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePayload } from '../../../scripts/lib/validate-schema.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dir, '../assets/schema.json');

const rawArg = process.argv[2] ?? await readStdin();

let payload;
try {
  payload = JSON.parse(rawArg);
} catch {
  console.error('❌ Payload não é JSON válido.');
  console.error(`   Formato esperado: '{"consumer_key":"...", "consumer_secret":"...", "code":"..."}'`);
  process.exit(1);
}

let schema;
try {
  schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
} catch {
  console.error(`❌ Schema não encontrado em ${SCHEMA_PATH}`);
  process.exit(1);
}

const errors = validatePayload(schema, payload);

if (errors.length === 0) {
  console.log('✅ Payload válido — pode prosseguir.');
  process.exit(0);
} else {
  const attempt = process.env.VALIDATE_ATTEMPT ?? 1;
  console.error(`❌ Validação falhou — ${errors.length} erro${errors.length > 1 ? 's' : ''}:`);
  for (const e of errors) {
    console.error(`  • ${e.message}`);
    console.error(`    → ${e.suggestion}`);
  }
  console.error(`\nCorrija e tente novamente (tentativa ${attempt}/3).`);
  process.exit(1);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8').trim();
}
```

- [ ] **Step 3: Testar payload válido**

```bash
node skills/autorizacao/scripts/validate.mjs '{"consumer_key":"abc","consumer_secret":"xyz","code":"123"}'
```

Saída esperada: `✅ Payload válido — pode prosseguir.`

- [ ] **Step 4: Testar payload inválido**

```bash
node skills/autorizacao/scripts/validate.mjs '{"consumer_key":"abc"}'
```

Saída esperada (exit code 1):
```
❌ Validação falhou — 2 erros:
  • "consumer_secret" é obrigatório mas está ausente.
    → Adicione: "consumer_secret": "<texto>"
  • "code" é obrigatório mas está ausente.
    → Adicione: "code": "<texto>"
```

- [ ] **Step 5: Commit**

```bash
git add skills/autorizacao/assets/schema.json skills/autorizacao/scripts/validate.mjs
git commit -m "feat(autorizacao): add JSON schema and validate.mjs"
```

---

## Task 5: Schema + validate.mjs — tray-webhooks

**Files:**
- Create: `skills/webhooks/assets/schema.json`
- Create: `skills/webhooks/scripts/validate.mjs`

- [ ] **Step 1: Criar `skills/webhooks/assets/schema.json`**

Cobre o payload recebido da Tray no endpoint receptor (form-urlencoded parseado):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WebhookPayload",
  "description": "Campos esperados no payload recebido da Tray via POST x-www-form-urlencoded",
  "type": "object",
  "required": ["seller_id", "scope_name", "act", "scope_id"],
  "properties": {
    "seller_id":        { "type": "string", "description": "ID da loja que disparou o evento" },
    "scope_id":         { "type": "string", "description": "ID do recurso afetado (produto, pedido etc.)" },
    "scope_name":       {
      "type": "string",
      "enum": ["product","product_price","product_stock","variant","variant_price","variant_stock","order","customer","store_config"],
      "description": "Nome do escopo do evento"
    },
    "act":              { "type": "string", "enum": ["insert","update","delete"], "description": "Ação ocorrida" },
    "app_code":         { "type": "string", "description": "Código do aplicativo receptor" },
    "url_notification": { "type": "string", "description": "URL de notificação cadastrada" }
  },
  "additionalProperties": true
}
```

> **Nota:** Os campos chegam como strings (form-urlencoded), por isso `seller_id` e `scope_id` são `"type": "string"`, não `"integer"`.

- [ ] **Step 2: Criar `skills/webhooks/scripts/validate.mjs`**

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePayload } from '../../../scripts/lib/validate-schema.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dir, '../assets/schema.json');

const rawArg = process.argv[2] ?? await readStdin();

let payload;
try {
  payload = JSON.parse(rawArg);
} catch {
  console.error('❌ Payload não é JSON válido.');
  console.error(`   Passe o payload form-urlencoded já parseado como JSON:`);
  console.error(`   '{"seller_id":"123","scope_name":"order","act":"insert","scope_id":"456"}'`);
  process.exit(1);
}

let schema;
try {
  schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
} catch {
  console.error(`❌ Schema não encontrado em ${SCHEMA_PATH}`);
  process.exit(1);
}

const errors = validatePayload(schema, payload);

if (errors.length === 0) {
  console.log('✅ Payload válido — pode prosseguir.');
  process.exit(0);
} else {
  const attempt = process.env.VALIDATE_ATTEMPT ?? 1;
  console.error(`❌ Validação falhou — ${errors.length} erro${errors.length > 1 ? 's' : ''}:`);
  for (const e of errors) {
    console.error(`  • ${e.message}`);
    console.error(`    → ${e.suggestion}`);
  }
  console.error(`\nCorrija e tente novamente (tentativa ${attempt}/3).`);
  process.exit(1);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8').trim();
}
```

- [ ] **Step 3: Testar payload válido**

```bash
node skills/webhooks/scripts/validate.mjs '{"seller_id":"391250","scope_id":"4375797","scope_name":"order","act":"update"}'
```

Saída esperada: `✅ Payload válido — pode prosseguir.`

- [ ] **Step 4: Testar escopo inválido**

```bash
node skills/webhooks/scripts/validate.mjs '{"seller_id":"391250","scope_id":"4375797","scope_name":"payment","act":"update"}'
```

Saída esperada (exit code 1):
```
❌ Validação falhou — 1 erro:
  • "scope_name" tem valor inválido: "payment".
    → Valores válidos: "product", "product_price", ...
```

- [ ] **Step 5: Commit**

```bash
git add skills/webhooks/assets/schema.json skills/webhooks/scripts/validate.mjs
git commit -m "feat(webhooks): add JSON schema and validate.mjs"
```

---

## Task 6: Schema + validate.mjs — tray-clientes

**Files:**
- Create: `skills/clientes/assets/schema.json`
- Create: `skills/clientes/scripts/validate.mjs`

- [ ] **Step 1: Criar `skills/clientes/assets/schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Customer",
  "description": "Payload para POST /customers e PUT /customers/:id na API Tray",
  "type": "object",
  "required": ["name", "email"],
  "properties": {
    "name":         { "type": "string", "maxLength": 200, "description": "Nome completo do cliente" },
    "email":        { "type": "string", "maxLength": 200, "description": "E-mail (único na plataforma)" },
    "cpf":          { "type": "string", "maxLength": 14,  "description": "CPF (pessoa física) — 11 dígitos" },
    "cnpj":         { "type": "string", "maxLength": 18,  "description": "CNPJ (pessoa jurídica) — 14 dígitos" },
    "rg":           { "type": "string", "maxLength": 20,  "description": "RG" },
    "phone":        { "type": "string", "maxLength": 20,  "description": "Telefone fixo" },
    "cellphone":    { "type": "string", "maxLength": 20,  "description": "Celular" },
    "birth_date":   { "type": "string", "maxLength": 10,  "description": "Data de nascimento YYYY-MM-DD" },
    "gender":       { "type": "string", "maxLength": 20,  "description": "Gênero" },
    "company_name": { "type": "string", "maxLength": 200, "description": "Razão social (pessoa jurídica)" },
    "newsletter":   { "type": "integer", "enum": [0, 1],  "description": "0=não inscrito, 1=inscrito" }
  },
  "additionalProperties": true
}
```

- [ ] **Step 2: Criar `skills/clientes/scripts/validate.mjs`**

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePayload } from '../../../scripts/lib/validate-schema.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dir, '../assets/schema.json');
const RESOURCE_KEY = 'Customer';

const rawArg = process.argv[2] ?? await readStdin();

let payload;
try {
  const parsed = JSON.parse(rawArg);
  payload = parsed[RESOURCE_KEY] ?? parsed;
} catch {
  console.error('❌ Payload não é JSON válido.');
  console.error(`   Formato esperado: '{"${RESOURCE_KEY}": {...}}' ou '{...}'`);
  process.exit(1);
}

let schema;
try {
  schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
} catch {
  console.error(`❌ Schema não encontrado em ${SCHEMA_PATH}`);
  process.exit(1);
}

const errors = validatePayload(schema, payload);

if (errors.length === 0) {
  console.log('✅ Payload válido — pode prosseguir.');
  process.exit(0);
} else {
  const attempt = process.env.VALIDATE_ATTEMPT ?? 1;
  console.error(`❌ Validação falhou — ${errors.length} erro${errors.length > 1 ? 's' : ''}:`);
  for (const e of errors) {
    console.error(`  • ${e.message}`);
    console.error(`    → ${e.suggestion}`);
  }
  console.error(`\nCorrija e tente novamente (tentativa ${attempt}/3).`);
  process.exit(1);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8').trim();
}
```

- [ ] **Step 3: Testar payload válido**

```bash
node skills/clientes/scripts/validate.mjs '{"Customer":{"name":"João Silva","email":"joao@exemplo.com"}}'
```

Saída esperada: `✅ Payload válido — pode prosseguir.`

- [ ] **Step 4: Testar payload inválido**

```bash
node skills/clientes/scripts/validate.mjs '{"Customer":{"name":"João Silva","newsletter":5}}'
```

Saída esperada (exit code 1):
```
❌ Validação falhou — 2 erros:
  • "email" é obrigatório mas está ausente.
    → Adicione: "email": "<texto>"
  • "newsletter" tem valor inválido: 5.
    → Valores válidos: 0, 1.
```

- [ ] **Step 5: Commit**

```bash
git add skills/clientes/assets/schema.json skills/clientes/scripts/validate.mjs
git commit -m "feat(clientes): add JSON schema and validate.mjs"
```

---

## Task 7: Atualizar SKILL.md das 5 skills prioritárias

Cada um dos 5 SKILL.md recebe: (a) `when_not_to_use` no frontmatter e (b) seção `## Antes de responder` com o passo 5 do validate.

**Files:**
- Modify: `skills/produtos/SKILL.md`
- Modify: `skills/pedidos/SKILL.md`
- Modify: `skills/autorizacao/SKILL.md`
- Modify: `skills/webhooks/SKILL.md`
- Modify: `skills/clientes/SKILL.md`

### 7a — skills/produtos/SKILL.md

- [ ] **Step 1: Adicionar `when_not_to_use` ao frontmatter**

No bloco `---` do frontmatter, após `when_to_use:`, adicionar:

```yaml
when_not_to_use: >
  Não use para variações/SKUs (use tray-variacoes), imagens de produto
  (use tray-imagens-produtos), kits/combos (use tray-kits), categorias
  (use tray-categorias), marcas (use tray-marcas), características
  (use tray-caracteristicas) ou informações adicionais (use tray-informacoes-adicionais).
```

- [ ] **Step 2: Adicionar seção `## Antes de responder`**

Inserir imediatamente após o fechamento do frontmatter (`---`) e antes do `# API de Produtos — Tray`:

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada (tabela Endpoints abaixo).
2. Identifique os campos obrigatórios: `name`, `price`, `status` — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.
5. Execute `node skills/produtos/scripts/validate.mjs '<payload_json>'`
   e corrija todos os erros antes de retornar o código ao usuário.
   Até 3 tentativas — se persistir, explique o problema ao usuário.

```

### 7b — skills/pedidos/SKILL.md

- [ ] **Step 3: Adicionar `when_not_to_use` ao frontmatter de pedidos**

```yaml
when_not_to_use: >
  Não use para gerenciar status de pedido (use tray-status-pedido), emitir notas fiscais
  (use tray-notas-fiscais), consultar pagamentos (use tray-pagamentos) ou
  configurar cupons (use tray-cupons).
```

- [ ] **Step 4: Adicionar seção `## Antes de responder` em pedidos**

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada (tabela Endpoints abaixo).
2. Identifique os campos obrigatórios: `client_id` para POST — não omita.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.
5. Execute `node skills/pedidos/scripts/validate.mjs '<payload_json>'`
   e corrija todos os erros antes de retornar o código ao usuário.
   Até 3 tentativas — se persistir, explique o problema ao usuário.

```

### 7c — skills/autorizacao/SKILL.md

- [ ] **Step 5: Adicionar `when_not_to_use` ao frontmatter de autorizacao**

```yaml
when_not_to_use: >
  Não use para fazer chamadas autenticadas aos recursos da API (produtos, pedidos etc.)
  — esta skill trata somente do fluxo OAuth inicial de geração e renovação de tokens.
```

- [ ] **Step 6: Adicionar seção `## Antes de responder` em autorizacao**

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme em qual etapa do OAuth o desenvolvedor está (Etapa 1 redirect, Etapa 2 callback ou Etapa 3 geração de tokens).
2. Campos obrigatórios para POST /auth: `consumer_key`, `consumer_secret`, `code`.
3. Nunca escreva `consumer_key`, `consumer_secret` ou `code` como literais no código.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.
5. Execute `node skills/autorizacao/scripts/validate.mjs '<payload_json>'`
   e corrija todos os erros antes de retornar o código ao usuário.
   Até 3 tentativas — se persistir, explique o problema ao usuário.

```

### 7d — skills/webhooks/SKILL.md

- [ ] **Step 7: Adicionar `when_not_to_use` ao frontmatter de webhooks**

```yaml
when_not_to_use: >
  Não use para fazer chamadas de escrita à API Tray (use a skill do recurso correspondente)
  — esta skill descreve como receber e processar notificações enviadas pela Tray,
  não como enviá-las. Para pagamentos, não existe escopo webhook; use tray-pedidos.
```

- [ ] **Step 8: Adicionar seção `## Antes de responder` em webhooks**

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer código de receptor:

1. Confirme que o endpoint receptor usa `Content-Type: application/x-www-form-urlencoded` (não JSON).
2. Verifique se os escopos necessários estão na lista suportada — pagamentos não têm escopo webhook.
3. Confirme que o código retorna HTTP 200 imediatamente (antes de processar) para evitar retentativas.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.
5. Execute `node skills/webhooks/scripts/validate.mjs '<payload_json>'`
   para validar que o handler lê todos os campos obrigatórios do payload.
   Até 3 tentativas — se persistir, explique o problema ao usuário.

```

### 7e — skills/clientes/SKILL.md

- [ ] **Step 9: Adicionar `when_not_to_use` ao frontmatter de clientes**

```yaml
when_not_to_use: >
  Não use para endereços de cliente (use tray-enderecos-cliente), perfis de cliente
  (use tray-perfis-cliente) ou gestão isolada de newsletter (use tray-newsletter).
```

- [ ] **Step 10: Adicionar seção `## Antes de responder` em clientes**

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada (tabela Endpoints abaixo).
2. Campos obrigatórios: `name` e `email` — o e-mail é identificador único na plataforma.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.
5. Execute `node skills/clientes/scripts/validate.mjs '<payload_json>'`
   e corrija todos os erros antes de retornar o código ao usuário.
   Até 3 tentativas — se persistir, explique o problema ao usuário.

```

- [ ] **Step 11: Commit**

```bash
git add skills/produtos/SKILL.md skills/pedidos/SKILL.md skills/autorizacao/SKILL.md skills/webhooks/SKILL.md skills/clientes/SKILL.md
git commit -m "feat: add when_not_to_use and mandatory tool calls to 5 priority skills"
```

---

## Task 8: Atualizar SKILL.md — grupo Catálogo (8 skills)

Adicionar `when_not_to_use` no frontmatter e seção `## Antes de responder` (sem passo 5) em:
`variacoes`, `imagens-produtos`, `categorias`, `marcas`, `kits`, `caracteristicas`, `informacoes-adicionais`, `palavras-chave`.

A seção `## Antes de responder` é idêntica para todas as skills sem validate.mjs:

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada (tabela Endpoints abaixo).
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.

```

**Files:**
- Modify: `skills/variacoes/SKILL.md`
- Modify: `skills/imagens-produtos/SKILL.md`
- Modify: `skills/categorias/SKILL.md`
- Modify: `skills/marcas/SKILL.md`
- Modify: `skills/kits/SKILL.md`
- Modify: `skills/caracteristicas/SKILL.md`
- Modify: `skills/informacoes-adicionais/SKILL.md`
- Modify: `skills/palavras-chave/SKILL.md`

**`when_not_to_use` para cada skill deste grupo:**

| Skill | `when_not_to_use` |
|:--|:--|
| `tray-variacoes` | Não use para o produto base (use `tray-produtos`), imagens (use `tray-imagens-produtos`) ou kits (use `tray-kits`). |
| `tray-imagens-produtos` | Não use para criar/atualizar produtos (use `tray-produtos`) ou variações (use `tray-variacoes`). |
| `tray-categorias` | Não use para criar produtos (use `tray-produtos`) ou marcas (use `tray-marcas`). |
| `tray-marcas` | Não use para criar produtos (use `tray-produtos`) ou categorias (use `tray-categorias`). |
| `tray-kits` | Não use para produtos simples (use `tray-produtos`) ou variações de um produto (use `tray-variacoes`). |
| `tray-caracteristicas` | Não use para criar produtos (use `tray-produtos`) ou categorias (use `tray-categorias`). |
| `tray-informacoes-adicionais` | Não use para criar produtos (use `tray-produtos`) ou características de produto (use `tray-caracteristicas`). |
| `tray-palavras-chave` | Não use para criar produtos (use `tray-produtos`) ou configurar categorias (use `tray-categorias`). |

- [ ] **Step 1: Aplicar alterações nas 8 skills**

Para cada skill da tabela acima:
1. Abrir `skills/<recurso>/SKILL.md`
2. Adicionar `when_not_to_use: >` após o campo `when_to_use:` (ou após `description:` se `when_to_use` não existir), com o conteúdo da tabela
3. Inserir o bloco `## Antes de responder` (sem passo 5) após o fechamento do frontmatter (`---`), antes do primeiro `#` de conteúdo

- [ ] **Step 2: Commit**

```bash
git add skills/variacoes/SKILL.md skills/imagens-produtos/SKILL.md skills/categorias/SKILL.md skills/marcas/SKILL.md skills/kits/SKILL.md skills/caracteristicas/SKILL.md skills/informacoes-adicionais/SKILL.md skills/palavras-chave/SKILL.md
git commit -m "feat: add when_not_to_use and mandatory tool calls to catalog skills"
```

---

## Task 9: Atualizar SKILL.md — grupo Pedidos/Fiscal (5 skills)

**Files:**
- Modify: `skills/status-pedido/SKILL.md`
- Modify: `skills/notas-fiscais/SKILL.md`
- Modify: `skills/produtos-vendidos/SKILL.md`
- Modify: `skills/pagamentos/SKILL.md`
- Modify: `skills/cupons/SKILL.md`

| Skill | `when_not_to_use` |
|:--|:--|
| `tray-status-pedido` | Não use para atualizar dados do pedido (use `tray-pedidos`) ou emitir notas fiscais (use `tray-notas-fiscais`). |
| `tray-notas-fiscais` | Não use para atualizar status ou dados do pedido (use `tray-pedidos`) ou status de pagamento (use `tray-pagamentos`). |
| `tray-produtos-vendidos` | Não use para pedidos ativos ou em andamento (use `tray-pedidos`) — este recurso é somente leitura de histórico de vendas. |
| `tray-pagamentos` | Não use para atualizar status de pedido (use `tray-pedidos`) ou emitir nota fiscal (use `tray-notas-fiscais`). Notificações de pagamento chegam via webhook de `order`, não via escopo `payment`. |
| `tray-cupons` | Não use para aplicar desconto diretamente em um pedido (use `tray-pedidos`) — cupons são configurações de regras de desconto, não ações de carrinho. |

- [ ] **Step 1: Aplicar `when_not_to_use` e `## Antes de responder` nas 5 skills**

Para cada skill da tabela acima:
1. Abrir `skills/<recurso>/SKILL.md`
2. Adicionar `when_not_to_use: >` após o campo `when_to_use:` (ou após `description:` se `when_to_use` não existir), com o conteúdo da tabela
3. Inserir o bloco `## Antes de responder` (sem passo 5) após o fechamento do frontmatter (`---`), antes do primeiro `#` de conteúdo:

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada (tabela Endpoints abaixo).
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.

```

- [ ] **Step 2: Commit**

```bash
git add skills/status-pedido/SKILL.md skills/notas-fiscais/SKILL.md skills/produtos-vendidos/SKILL.md skills/pagamentos/SKILL.md skills/cupons/SKILL.md
git commit -m "feat: add when_not_to_use and mandatory tool calls to order/fiscal skills"
```

---

## Task 10: Atualizar SKILL.md — grupo Cliente/Endereço (4 skills)

**Files:**
- Modify: `skills/enderecos-cliente/SKILL.md`
- Modify: `skills/perfis-cliente/SKILL.md`
- Modify: `skills/newsletter/SKILL.md`
- Modify: `skills/listas-preco-b2b/SKILL.md`

| Skill | `when_not_to_use` |
|:--|:--|
| `tray-enderecos-cliente` | Não use para dados cadastrais do cliente (use `tray-clientes`) ou perfis de cliente (use `tray-perfis-cliente`). |
| `tray-perfis-cliente` | Não use para dados cadastrais do cliente (use `tray-clientes`) ou endereços (use `tray-enderecos-cliente`). |
| `tray-newsletter` | Não use para criar ou atualizar dados do cliente (use `tray-clientes`) — gerencia apenas inscrição/desincrição na newsletter. |
| `tray-listas-preco-b2b` | Não use para criar cupons de desconto (use `tray-cupons`) ou configurar pagamentos (use `tray-pagamentos`) — gerencia tabelas de preço para clientes B2B. |

- [ ] **Step 1: Aplicar alterações nas 4 skills**

Para cada skill da tabela acima:
1. Abrir `skills/<recurso>/SKILL.md`
2. Adicionar `when_not_to_use: >` após o campo `when_to_use:` (ou após `description:` se `when_to_use` não existir), com o conteúdo da tabela
3. Inserir o bloco abaixo após o fechamento do frontmatter (`---`), antes do primeiro `#` de conteúdo:

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada (tabela Endpoints abaixo).
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.

```

- [ ] **Step 2: Commit**

```bash
git add skills/enderecos-cliente/SKILL.md skills/perfis-cliente/SKILL.md skills/newsletter/SKILL.md skills/listas-preco-b2b/SKILL.md
git commit -m "feat: add when_not_to_use and mandatory tool calls to customer skills"
```

---

## Task 11: Atualizar SKILL.md — grupo Frete/Logística (5 skills)

**Files:**
- Modify: `skills/frete/SKILL.md`
- Modify: `skills/configuracao-frete/SKILL.md`
- Modify: `skills/etiquetas-hub/SKILL.md`
- Modify: `skills/etiquetas-mercado-livre/SKILL.md`
- Modify: `skills/emissores-etiqueta/SKILL.md`

| Skill | `when_not_to_use` |
|:--|:--|
| `tray-frete` | Não use para configurar formas de envio (use `tray-configuracao-frete`) ou emitir etiquetas (use `tray-etiquetas-hub`). Serve apenas para cálculo de cotação. |
| `tray-configuracao-frete` | Não use para calcular frete (use `tray-frete`) ou emitir etiquetas (use `tray-etiquetas-hub`). |
| `tray-etiquetas-hub` | Não use para calcular frete (use `tray-frete`), etiquetas Mercado Livre (use `tray-etiquetas-mercado-livre`) ou cadastrar emissor (use `tray-emissores-etiqueta`). |
| `tray-etiquetas-mercado-livre` | Não use para etiquetas de transportadoras genéricas (use `tray-etiquetas-hub`) ou cálculo de frete (use `tray-frete`). |
| `tray-emissores-etiqueta` | Não use para buscar etiquetas geradas (use `tray-etiquetas-hub`) ou configurar formas de envio (use `tray-configuracao-frete`). |

- [ ] **Step 1: Aplicar alterações nas 5 skills**

Para cada skill da tabela acima:
1. Abrir `skills/<recurso>/SKILL.md`
2. Adicionar `when_not_to_use: >` após o campo `when_to_use:` (ou após `description:` se `when_to_use` não existir), com o conteúdo da tabela
3. Inserir o bloco abaixo após o fechamento do frontmatter (`---`), antes do primeiro `#` de conteúdo:

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada (tabela Endpoints abaixo).
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.

```

- [ ] **Step 2: Commit**

```bash
git add skills/frete/SKILL.md skills/configuracao-frete/SKILL.md skills/etiquetas-hub/SKILL.md skills/etiquetas-mercado-livre/SKILL.md skills/emissores-etiqueta/SKILL.md
git commit -m "feat: add when_not_to_use and mandatory tool calls to shipping skills"
```

---

## Task 12: Atualizar SKILL.md — grupo Infra/Outros (7 skills)

**Files:**
- Modify: `skills/carrinho-compras/SKILL.md`
- Modify: `skills/listagem-carrinho/SKILL.md`
- Modify: `skills/informacoes-loja/SKILL.md`
- Modify: `skills/scripts-externos/SKILL.md`
- Modify: `skills/parceiros/SKILL.md`
- Modify: `skills/usuarios/SKILL.md`
- Modify: `skills/multicd/SKILL.md`

| Skill | `when_not_to_use` |
|:--|:--|
| `tray-carrinho-compras` | Não use para consultar pedidos já criados (use `tray-pedidos`) — o carrinho representa a sessão de compra antes do checkout. |
| `tray-listagem-carrinho` | Não use para detalhes de um carrinho específico (use `tray-carrinho-compras`) ou pedidos concluídos (use `tray-pedidos`). |
| `tray-informacoes-loja` | Não use para configurar formas de envio (use `tray-configuracao-frete`) ou scripts externos (use `tray-scripts-externos`) — serve apenas para leitura de dados gerais da loja. |
| `tray-scripts-externos` | Não use para configurações gerais da loja (use `tray-informacoes-loja`) ou webhooks (use `tray-webhooks`). |
| `tray-parceiros` | Não use para gestão de usuários internos da loja (use `tray-usuarios`) ou clientes da loja (use `tray-clientes`). |
| `tray-usuarios` | Não use para parceiros/integradores externos (use `tray-parceiros`) ou clientes da loja (use `tray-clientes`). |
| `tray-multicd` | Não use para configurar formas de envio (use `tray-configuracao-frete`) ou calcular frete (use `tray-frete`) — MultiCD gerencia centros de distribuição e estoque por CD. |

- [ ] **Step 1: Aplicar alterações nas 7 skills**

Para cada skill da tabela acima:
1. Abrir `skills/<recurso>/SKILL.md`
2. Adicionar `when_not_to_use: >` após o campo `when_to_use:` (ou após `description:` se `when_to_use` não existir), com o conteúdo da tabela
3. Inserir o bloco abaixo após o fechamento do frontmatter (`---`), antes do primeiro `#` de conteúdo:

```markdown
## Antes de responder

> Execute estas verificações antes de gerar qualquer payload ou código:

1. Confirme o método HTTP e endpoint correto para a operação solicitada (tabela Endpoints abaixo).
2. Identifique os campos obrigatórios listados neste documento — não omita nenhum.
3. Verifique que `access_token` não aparece como literal string no código gerado.
4. Confirme que esta é a skill correta — leia `when_not_to_use` no frontmatter.

```

- [ ] **Step 2: Commit**

```bash
git add skills/carrinho-compras/SKILL.md skills/listagem-carrinho/SKILL.md skills/informacoes-loja/SKILL.md skills/scripts-externos/SKILL.md skills/parceiros/SKILL.md skills/usuarios/SKILL.md skills/multicd/SKILL.md
git commit -m "feat: add when_not_to_use and mandatory tool calls to infra skills"
```

---

## Task 13: Atualizar smoke-test.js com novos checks

**Files:**
- Modify: `scripts/smoke-test.js`

- [ ] **Step 1: Adicionar 3 novas seções de validação ao `smoke-test.js`**

Inserir antes do bloco `// ─── Resultado final ───` (última seção):

```js
// ─── 6. Seção "Antes de responder" em todos os SKILL.md ────────────────────────

section('6. Seção "Antes de responder" nos SKILL.md');

walkDir(join(ROOT, 'skills'), 'SKILL.md', (fullPath) => {
  const rel = fullPath.replace(ROOT + '/', '');
  try {
    const content = readFileSync(fullPath, 'utf-8');
    if (content.includes('## Antes de responder')) {
      ok(`${rel} — seção "Antes de responder" presente`);
    } else {
      fail(`${rel} — seção "Antes de responder" ausente`);
    }
  } catch (e) {
    fail(`${rel} — não foi possível ler: ${e.message}`);
  }
});

// ─── 7. Campo when_not_to_use em todos os SKILL.md ─────────────────────────────

section('7. Campo when_not_to_use nos SKILL.md');

walkDir(join(ROOT, 'skills'), 'SKILL.md', (fullPath) => {
  const rel = fullPath.replace(ROOT + '/', '');
  try {
    const content = readFileSync(fullPath, 'utf-8');
    if (content.includes('when_not_to_use:')) {
      ok(`${rel} — campo when_not_to_use presente`);
    } else {
      fail(`${rel} — campo when_not_to_use ausente no frontmatter`);
    }
  } catch (e) {
    fail(`${rel} — não foi possível ler: ${e.message}`);
  }
});

// ─── 8. Scripts validate.mjs e schemas existem para as 5 skills ────────────────

section('8. validate.mjs e schema.json nas 5 skills prioritárias');

const prioritySkills = ['produtos', 'pedidos', 'autorizacao', 'webhooks', 'clientes'];

for (const skill of prioritySkills) {
  const schemaPath  = join(ROOT, 'skills', skill, 'assets', 'schema.json');
  const scriptPath  = join(ROOT, 'skills', skill, 'scripts', 'validate.mjs');

  try {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    JSON.parse(schemaContent);
    ok(`skills/${skill}/assets/schema.json — JSON válido`);
  } catch (e) {
    fail(`skills/${skill}/assets/schema.json — ${e.message}`);
  }

  try {
    readFileSync(scriptPath, 'utf-8');
    ok(`skills/${skill}/scripts/validate.mjs — presente`);
  } catch {
    fail(`skills/${skill}/scripts/validate.mjs — arquivo não encontrado`);
  }
}
```

- [ ] **Step 2: Executar smoke-test completo**

```bash
node scripts/smoke-test.js
```

Saída esperada: `🟢 Smoke test passou sem erros.`
(Todas as seções 1–8 devem aparecer com ✅)

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-test.js
git commit -m "test: expand smoke-test with validation for when_not_to_use, Antes de responder and validate.mjs"
```

---

## Checklist de cobertura do spec

| Requisito do spec | Task que implementa |
|:--|:--|
| `when_not_to_use` em todas as 34 skills | Tasks 7–12 |
| Seção `## Antes de responder` em todas as 34 skills | Tasks 7–12 |
| Passo 5 (validate) nas 5 skills prioritárias | Task 7 |
| `schema.json` para produtos, pedidos, autorizacao, webhooks, clientes | Tasks 2–6 |
| `validate.mjs` para produtos, pedidos, autorizacao, webhooks, clientes | Tasks 2–6 |
| Biblioteca compartilhada sem deps npm | Task 1 |
| smoke-test expandido | Task 13 |
