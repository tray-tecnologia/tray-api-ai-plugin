/**
 * Lib de validação compartilhada para os validate.mjs das skills.
 *
 * Implementa um subset documentado de JSON Schema Draft-07 (ver
 * scripts/lib/SUBSET.md) suficiente para validar payloads da API Tray
 * sem dependências de npm em runtime.
 *
 * Suporta: $schema, title, description, type, properties, required,
 * additionalProperties (false), enum, maxLength, minimum, pattern, format.
 *
 * Não suporta (rejeitado pelo lint-schemas.mjs): oneOf, anyOf, allOf,
 * if/then/else, $ref, definitions, dependencies.
 *
 * AJV é usado apenas em testes como oracle de conformidade (Task 4).
 * Runtime permanece zero-deps.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMATS } from './formats-br.mjs';

const FORMAT_MESSAGES = {
  cpf: 'CPF inválido — algoritmo de verificação falhou. Use 11 dígitos numéricos com DV correto.',
  cnpj: 'CNPJ inválido — algoritmo de verificação falhou. Use 14 dígitos numéricos com DV correto.',
  cep: 'CEP inválido — use 8 dígitos numéricos.',
  ean: 'EAN/GTIN inválido — DV incorreto. Aceitos: GTIN-8, GTIN-12, GTIN-13, GTIN-14.',
  ncm: 'NCM inválido — use 8 dígitos numéricos.',
  date: 'Data inválida — use YYYY-MM-DD (ex.: 2026-04-15).',
  datetime: 'Datetime inválido — use YYYY-MM-DD HH:MM:SS.',
  email: 'Email inválido — formato esperado: usuario@dominio.tld',
  uri: 'URI inválida — protocolo http/https obrigatório.',
};

export const VALIDATOR_VERSION = '2.0.0';

/* ─── Tipos ─────────────────────────────────────────────────────────── */

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

/* ─── Validação básica ──────────────────────────────────────────────── */

/**
 * Valida um payload contra um schema do subset suportado.
 *
 * @param {object} schema  — JSON Schema Draft-07 (subset)
 * @param {object} payload — objeto a validar
 * @returns {Array<{ path: string, keyword: string, message: string, hint: string }>}
 */
export function validatePayload(schema, payload) {
  const errors = [];
  const properties = schema.properties ?? {};
  const titlePrefix = schema.title ? `/${schema.title}` : '';

  // required
  for (const field of schema.required ?? []) {
    const value = payload[field];
    if (value === undefined || value === null || value === '') {
      const prop = properties[field] ?? {};
      const desc = prop.description ? ` (${prop.description})` : '';
      errors.push({
        path: `${titlePrefix}/${field}`,
        keyword: 'required',
        message: `"${field}" é obrigatório mas está ausente.`,
        hint: `→ Adicione: "${field}": ${suggestValueFor(prop)}${desc}`,
      });
    }
  }

  // properties
  for (const [field, def] of Object.entries(properties)) {
    const value = payload[field];
    if (value === undefined || value === null) continue;

    if (def.type && !matchesType(value, def.type)) {
      const expected = Array.isArray(def.type) ? def.type.join(' ou ') : def.type;
      errors.push({
        path: `${titlePrefix}/${field}`,
        keyword: 'type',
        message: `"${field}" deve ser do tipo ${expected} (recebido: ${typeof value}).`,
        hint: `→ Corrija o tipo do campo "${field}"`,
      });
      continue;
    }

    if (def.maxLength !== undefined && typeof value === 'string' && value.length > def.maxLength) {
      errors.push({
        path: `${titlePrefix}/${field}`,
        keyword: 'maxLength',
        message: `"${field}" excede ${def.maxLength} caracteres (atual: ${value.length}).`,
        hint: `→ Trunce para no máximo ${def.maxLength} caracteres`,
      });
    }

    if (def.minimum !== undefined) {
      const num = Number(value);
      if (!Number.isNaN(num) && num < def.minimum) {
        errors.push({
          path: `${titlePrefix}/${field}`,
          keyword: 'minimum',
          message: `"${field}" deve ser >= ${def.minimum} (atual: ${num}).`,
          hint: `→ Use um valor maior ou igual a ${def.minimum}`,
        });
      }
    }

    if (def.enum !== undefined) {
      const allowed = def.enum.map(String);
      if (!allowed.includes(String(value))) {
        errors.push({
          path: `${titlePrefix}/${field}`,
          keyword: 'enum',
          message: `"${field}" tem valor inválido: ${JSON.stringify(value)}.`,
          hint: `→ Valores aceitos: ${def.enum.map((v) => JSON.stringify(v)).join(', ')}`,
        });
      }
    }
  }

  // additionalProperties: false
  if (schema.additionalProperties === false) {
    const known = new Set(Object.keys(properties));
    for (const field of Object.keys(payload)) {
      if (!known.has(field)) {
        errors.push({
          path: `${titlePrefix}/${field}`,
          keyword: 'additionalProperties',
          message: `"${field}" não é um campo reconhecido (additionalProperties: false).`,
          hint: `→ Remova "${field}" ou verifique se a skill correta é outra (leia when_not_to_use).`,
        });
      }
    }
  }

  return errors;
}

/* ─── runValidator (esqueleto; flags em Task 8) ─────────────────────── */

/**
 * Lê stdin de forma portável, retornando string vazia se TTY.
 */
async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8').trim();
}

async function resolveRawPayload(positional) {
  if (positional) return positional;
  return await readStdin();
}

/**
 * Helper de alto nível usado por cada skills/<recurso>/scripts/validate.mjs.
 * Em Task 8 esta função ganha suporte a --json, --schema, --list-schemas.
 * Esta versão da Task 6 é o esqueleto compatível com a v1.
 */
export async function runValidator({ callerUrl, skillName, usageExample }) {
  const __dir = dirname(fileURLToPath(callerUrl));
  // Caminho legado (assets/schema.json) — Task 8 substitui por schemas/
  const legacyPath = join(__dir, '..', 'assets', 'schema.json');

  let schema;
  try {
    schema = JSON.parse(readFileSync(legacyPath, 'utf-8'));
  } catch (e) {
    console.error(`❌ Schema não encontrado em ${legacyPath}: ${e.message}`);
    process.exit(2);
  }

  const raw = await resolveRawPayload(process.argv[2]);
  if (!raw) {
    console.error(`❌ Nenhum payload fornecido para skill "${skillName}".`);
    console.error(`   Uso: node validate.mjs '${usageExample}'`);
    process.exit(2);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Payload não é JSON válido: ${e.message}`);
    process.exit(2);
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
