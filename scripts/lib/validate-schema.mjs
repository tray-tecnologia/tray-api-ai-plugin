/**
 * Biblioteca de validação compartilhada para os scripts validate.mjs das skills.
 *
 * Implementa um subset do JSON Schema Draft-07 suficiente para validar payloads
 * típicos da API Tray sem dependências de npm:
 *   - required
 *   - type (string, number, integer, boolean, array, object, null) — aceita string|array
 *   - maxLength
 *   - minimum
 *   - enum
 *   - additionalProperties: false (rejeita campos não documentados)
 *
 * Não tenta ser conformidade completa com Draft-07 — é uma heurística pragmática
 * para guiar o agente a montar payloads mais corretos antes de chamar a API.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Verifica se um valor casa com um tipo (ou união de tipos) JSON Schema.
 */
export function matchesType(value, type) {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => {
    if (t === 'string') return typeof value === 'string';
    if (t === 'number') return typeof value === 'number';
    if (t === 'integer') return Number.isInteger(value);
    if (t === 'boolean') return typeof value === 'boolean';
    if (t === 'array') return Array.isArray(value);
    if (t === 'object') return typeof value === 'object' && !Array.isArray(value) && value !== null;
    if (t === 'null') return value === null;
    return false;
  });
}

function suggestValueFor(prop) {
  if (!prop || !prop.type) return '<valor>';
  const types = Array.isArray(prop.type) ? prop.type : [prop.type];
  if (types.includes('string')) return '"<valor>"';
  if (types.includes('integer')) return '<inteiro>';
  if (types.includes('number')) return '<número>';
  if (types.includes('boolean')) return 'true';
  if (types.includes('array')) return '[]';
  if (types.includes('object')) return '{}';
  return '<valor>';
}

/**
 * Valida um payload contra um schema JSON (subset suportado).
 *
 * @param {object} schema  — schema JSON com properties / required / additionalProperties.
 * @param {object} payload — objeto a validar.
 * @returns {Array<{ message: string, hint: string }>} lista de erros (vazia = válido).
 */
export function validatePayload(schema, payload) {
  const errors = [];
  const properties = schema.properties ?? {};

  for (const field of schema.required ?? []) {
    const value = payload[field];
    if (value === undefined || value === null || value === '') {
      const prop = properties[field] ?? {};
      const desc = prop.description ? ` (${prop.description})` : '';
      errors.push({
        message: `"${field}" é obrigatório mas está ausente.`,
        hint: `→ Adicione: "${field}": ${suggestValueFor(prop)}${desc}`,
      });
    }
  }

  for (const [field, def] of Object.entries(properties)) {
    const value = payload[field];
    if (value === undefined || value === null) continue;

    if (def.type && !matchesType(value, def.type)) {
      const expected = Array.isArray(def.type) ? def.type.join(' ou ') : def.type;
      errors.push({
        message: `"${field}" deve ser do tipo ${expected} (recebido: ${typeof value}).`,
        hint: `→ Corrija o tipo do campo "${field}"`,
      });
      continue;
    }

    if (def.maxLength !== undefined && typeof value === 'string' && value.length > def.maxLength) {
      errors.push({
        message: `"${field}" excede ${def.maxLength} caracteres (atual: ${value.length}).`,
        hint: `→ Trunce para no máximo ${def.maxLength} caracteres`,
      });
    }

    if (def.minimum !== undefined) {
      const num = Number(value);
      if (!Number.isNaN(num) && num < def.minimum) {
        errors.push({
          message: `"${field}" deve ser >= ${def.minimum} (atual: ${num}).`,
          hint: `→ Use um valor maior ou igual a ${def.minimum}`,
        });
      }
    }

    if (def.enum !== undefined) {
      const allowed = def.enum.map(String);
      if (!allowed.includes(String(value))) {
        errors.push({
          message: `"${field}" tem valor inválido: ${JSON.stringify(value)}.`,
          hint: `→ Valores aceitos: ${def.enum.map((v) => JSON.stringify(v)).join(', ')}`,
        });
      }
    }
  }

  if (schema.additionalProperties === false) {
    const known = new Set(Object.keys(properties));
    for (const field of Object.keys(payload)) {
      if (!known.has(field)) {
        errors.push({
          message: `"${field}" não é um campo reconhecido (additionalProperties: false).`,
          hint: `→ Remova "${field}" ou verifique se a skill correta é outra (leia when_not_to_use).`,
        });
      }
    }
  }

  return errors;
}

/**
 * Lê stdin de forma portável (Linux/macOS/Windows), retornando string vazia se
 * stdin for um TTY (sem entrada redirecionada).
 */
async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8').trim();
}

/**
 * Resolve o payload bruto: 1º) argumento CLI, 2º) stdin redirecionado.
 */
async function resolveRawPayload() {
  const arg = process.argv[2];
  if (arg) return arg;
  return await readStdin();
}

/**
 * Helper de alto nível usado por cada `skills/<recurso>/scripts/validate.mjs`.
 * Cada skill chama `runValidator({ skillName, schemaFilename, usageExample })`
 * passando metadados; este helper cuida de:
 *   - Localizar e carregar o schema relativo ao validate.mjs do caller
 *   - Ler o payload (CLI ou stdin)
 *   - Desembrulhar o envelope `{"<title>": {...}}` quando aplicável
 *   - Validar e imprimir resultado em PT-BR
 *   - process.exit(0|1) conforme resultado
 *
 * @param {object} opts
 * @param {string} opts.callerUrl       — `import.meta.url` do validate.mjs caller
 * @param {string} opts.skillName       — nome da skill (ex.: "produtos")
 * @param {string} opts.usageExample    — payload de exemplo para mensagens de erro
 */
export async function runValidator({ callerUrl, skillName, usageExample }) {
  const __dir = dirname(fileURLToPath(callerUrl));
  const schemaPath = join(__dir, '..', 'assets', 'schema.json');

  let schema;
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  } catch (e) {
    console.error(`❌ Schema não encontrado em ${schemaPath}: ${e.message}`);
    process.exit(1);
  }

  const raw = await resolveRawPayload();
  if (!raw) {
    console.error(`❌ Nenhum payload fornecido para skill "${skillName}".`);
    console.error(`   Uso: node validate.mjs '${usageExample}'`);
    console.error(
      `   Dica: este validador checa apenas a estrutura (campos obrigatórios, tipos, campos desconhecidos). Pode-se passar placeholders nos valores — só os nomes e tipos importam.`,
    );
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Payload não é JSON válido: ${e.message}`);
    console.error(`   Exemplo: '${usageExample}'`);
    process.exit(1);
  }

  if (
    schema.title &&
    payload[schema.title] &&
    typeof payload[schema.title] === 'object' &&
    !Array.isArray(payload[schema.title])
  ) {
    payload = payload[schema.title];
  }

  const errors = validatePayload(schema, payload);

  if (errors.length === 0) {
    console.log('✅ Payload válido — pode prosseguir.');
    process.exit(0);
  }

  const attempt = process.env.VALIDATE_ATTEMPT ?? '1';
  console.error(`❌ Validação falhou — ${errors.length} erro${errors.length > 1 ? 's' : ''}:`);
  for (const err of errors) {
    console.error(`  • ${err.message}`);
    console.error(`    ${err.hint}`);
  }
  console.error(`\nCorrija e tente novamente (tentativa ${attempt}/3).`);
  process.exit(1);
}
