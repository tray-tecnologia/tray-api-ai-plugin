#!/usr/bin/env node
/**
 * Linter de schemas: garante que cada schema usado pelas skills usa apenas
 * features do subset documentado em scripts/lib/SUBSET.md.
 *
 * Uso:
 *   node scripts/lint-schemas.mjs              # lint em todos os schemas
 *   node scripts/lint-schemas.mjs <arquivo>    # lint num arquivo específico
 *
 * Rejeita keywords como oneOf, anyOf, allOf, $ref, definitions, dependencies,
 * if/then/else. Rejeita formats não reconhecidos. Rejeita additionalProperties
 * não-false.
 *
 * Importado pelo scripts/smoke-test.js (seção 12) e usado em CI.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FORMATS } from './lib/formats-br.mjs';

export const ALLOWED_KEYWORDS = [
  '$schema',
  'title',
  'description',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'enum',
  'maxLength',
  'minimum',
  'pattern',
  'format',
];

export const FORBIDDEN_KEYWORDS = [
  'oneOf', 'anyOf', 'allOf', 'not',
  'if', 'then', 'else',
  '$ref', 'definitions', '$defs',
  'dependencies', 'dependentRequired', 'dependentSchemas',
  'propertyNames', 'patternProperties',
  'minLength', 'maxItems', 'minItems', 'uniqueItems',
  'multipleOf', 'exclusiveMinimum', 'exclusiveMaximum', 'maximum',
  'const', 'contentEncoding', 'contentMediaType', 'examples',
  'items', 'additionalItems',  // arrays não usados no plugin
];

export const ALLOWED_FORMATS = Object.keys(FORMATS);

/**
 * Roda lint num objeto schema. Recursivo: visita properties.
 *
 * @param {object} schema
 * @param {string} path  prefixo para mensagens de erro
 * @returns {string[]} lista de erros (vazia = lint passou)
 */
export function lintSchema(schema, path = '#') {
  const errors = [];

  if (typeof schema !== 'object' || schema === null) return errors;

  for (const key of Object.keys(schema)) {
    if (FORBIDDEN_KEYWORDS.includes(key)) {
      errors.push(`${path}: keyword "${key}" não pertence ao subset (ver scripts/lib/SUBSET.md).`);
    }
  }

  if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
    errors.push(`${path}: additionalProperties deve ser false ou ausente; recebido ${JSON.stringify(schema.additionalProperties)}.`);
  }

  if (schema.format !== undefined && !ALLOWED_FORMATS.includes(schema.format)) {
    errors.push(`${path}: format "${schema.format}" não reconhecido. Permitidos: ${ALLOWED_FORMATS.join(', ')}.`);
  }

  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      errors.push(...lintSchema(propSchema, `${path}/properties/${propName}`));
    }
  }

  return errors;
}

/* ─── CLI ─────────────────────────────────────────────────────────── */

function findSchemaFiles(rootDir) {
  const out = [];
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (entry.endsWith('.json') && full.includes(`${join('skills')}`) && full.includes(`${join('schemas')}`)) {
        out.push(full);
      }
    }
  }
  walk(rootDir);
  return out;
}

function isDirectExecution() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

function main() {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(__dir, '..');

  const arg = process.argv[2];
  const targets = arg ? [arg] : findSchemaFiles(join(ROOT, 'skills'));

  let totalErrors = 0;
  for (const file of targets) {
    let schema;
    try {
      schema = JSON.parse(readFileSync(file, 'utf-8'));
    } catch (e) {
      console.error(`❌ ${file}: JSON malformado — ${e.message}`);
      totalErrors++;
      continue;
    }
    const errors = lintSchema(schema);
    if (errors.length === 0) {
      console.log(`✅ ${file}`);
    } else {
      console.error(`❌ ${file}:`);
      for (const err of errors) console.error(`   ${err}`);
      totalErrors += errors.length;
    }
  }

  if (totalErrors === 0) {
    console.log(`\nLint passou em ${targets.length} schema(s).`);
    process.exit(0);
  }
  console.error(`\n${totalErrors} erro(s) em ${targets.length} arquivo(s).`);
  process.exit(1);
}

if (isDirectExecution()) main();
