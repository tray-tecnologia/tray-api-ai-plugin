#!/usr/bin/env node
/**
 * Linter de SKILL.md: valida bloco MANDATORY, ordem de seções e referências
 * obrigatórias (search_docs, validate onde aplicável).
 *
 * Uso:
 *   node scripts/lint-skills.mjs              # varre cada SKILL.md em subpastas de skills/
 *   node scripts/lint-skills.mjs <arquivo>    # um SKILL.md
 *
 * Flags: --json (saída programática), --help
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SKIP_SKILLS = ['tray-dev', 'visao-geral'];
export const VALIDATE_SKILLS = [
  'autorizacao',
  'produtos',
  'pedidos',
  'clientes',
  'webhooks',
  'variacoes',
  'categorias',
  'marcas',
];

const R1_HEADER =
  /^## MANDATORY: Tool Calls? Required Before Answering$/gm;
const R1_HEADER_SINGLE =
  /^## MANDATORY: Tool Calls? Required Before Answering$/m;
const ANTES_HEADER = /^## Antes de responder$/m;
const NEXT_SECTION = /^## /m;

const SEARCH_LITERAL = 'node skills/tray-dev/scripts/search_docs.mjs';
const OBRIGATORIA_LITERAL = 'OBRIGATÓRIA';

/**
 * @param {string} skillsRoot diretório `skills` (contém pastas por recurso)
 * @returns {string[]} paths absolutos para cada `SKILL.md`
 */
export function findSkillFiles(skillsRoot) {
  const out = [];
  for (const entry of readdirSync(skillsRoot)) {
    const dir = join(skillsRoot, entry);
    if (!statSync(dir).isDirectory()) continue;
    const skillMd = join(dir, 'SKILL.md');
    if (existsSync(skillMd)) out.push(resolve(skillMd));
  }
  return out.sort();
}

function validateLiteral(resourceName) {
  return `node skills/${resourceName}/scripts/validate.mjs`;
}

function mandatoryMatches(content) {
  return [...content.matchAll(R1_HEADER)];
}

function getAntesDeResponderBody(content) {
  const m = content.match(ANTES_HEADER);
  if (!m || m.index === undefined) return null;
  const afterHeader = content.slice(m.index + m[0].length);
  const next = afterHeader.search(NEXT_SECTION);
  const body = next === -1 ? afterHeader : afterHeader.slice(0, next);
  return body;
}

/**
 * @param {string} resourceName nome da pasta da skill (ex.: produtos)
 * @param {string} content markdown completo do SKILL.md
 * @returns {{rule: string, message: string}[]}
 */
export function lintSkill(resourceName, content) {
  if (SKIP_SKILLS.includes(resourceName)) return [];

  const errors = [];

  const matches = mandatoryMatches(content);
  if (matches.length === 0) {
    errors.push({
      rule: 'R1',
      message:
        'Deve existir exatamente uma linha "## MANDATORY: Tool Call(s) Required Before Answering"; nenhuma encontrada.',
    });
  } else if (matches.length > 1) {
    errors.push({
      rule: 'R1',
      message: `Deve existir exatamente uma linha de header MANDATORY; encontradas ${matches.length}.`,
    });
  }

  if (matches.length === 1) {
    const antes = content.match(ANTES_HEADER);
    if (antes) {
      const mandatoryIdx = matches[0].index ?? 0;
      const antesIdx = antes.index ?? 0;
      if (mandatoryIdx >= antesIdx) {
        errors.push({
          rule: 'R2',
          message:
            'O header "## MANDATORY: Tool Call(s) Required Before Answering" deve aparecer antes da seção "## Antes de responder".',
        });
      }
    }
  }

  if (!content.includes(SEARCH_LITERAL)) {
    errors.push({
      rule: 'R3',
      message: `O literal "${SEARCH_LITERAL}" é obrigatório no conteúdo.`,
    });
  }

  if (VALIDATE_SKILLS.includes(resourceName)) {
    const need = validateLiteral(resourceName);
    if (!content.includes(need)) {
      errors.push({
        rule: 'R4',
        message: `Skills com validate devem incluir o literal "${need}".`,
      });
    }
    const antesBody = getAntesDeResponderBody(content);
    if (antesBody !== null && antesBody.includes('validate.mjs')) {
      errors.push({
        rule: 'R5',
        message:
          'A seção "## Antes de responder" não deve mencionar validate.mjs (remover step legado).',
      });
    }
  }

  if (!content.includes(OBRIGATORIA_LITERAL)) {
    errors.push({
      rule: 'R6',
      message:
        'O conteúdo deve conter a substring "OBRIGATÓRIA" (maiúsculas, com acento).',
    });
  }

  return errors;
}

/* ─── CLI ─────────────────────────────────────────────────────────── */

function isDirectExecution() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

function printHelp() {
  console.log(`Uso:
  node scripts/lint-skills.mjs [opções] [caminho/SKILL.md]

Sem argumentos: lint em todas as skills/*/SKILL.md (exceto SKIP_SKILLS na saída).

Opções:
  --json    Emite JSON: array de { file, rule, message }
  --help    Esta ajuda

Exit: 0 ok · 1 erro(s) de lint · 2 erro de uso (arquivo inexistente, flags inválidas).`);
}

function parseCli(argv) {
  let json = false;
  const positionals = [];
  for (const a of argv) {
    if (a === '--help' || a === '-h') return { help: true };
    if (a === '--json') {
      json = true;
      continue;
    }
    if (a.startsWith('-')) {
      return { usageError: `flag desconhecida: ${a}` };
    }
    positionals.push(a);
  }
  if (positionals.length > 1) {
    return { usageError: 'no máximo um caminho de arquivo é aceito' };
  }
  return { json, file: positionals[0] ?? null };
}

function resourceFromSkillPath(absPath) {
  return basename(dirname(absPath));
}

function main() {
  const parsed = parseCli(process.argv.slice(2));
  if ('usageError' in parsed && parsed.usageError) {
    console.error(parsed.usageError);
    process.exit(2);
  }
  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  const __dir = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(__dir, '..');
  const skillsDir = join(ROOT, 'skills');

  /** @type {{file: string, errors: ReturnType<typeof lintSkill>}[]} */
  const results = [];

  if (parsed.file) {
    const abs = resolve(parsed.file);
    if (!existsSync(abs)) {
      console.error(`arquivo não encontrado: ${abs}`);
      process.exit(2);
    }
    const resourceName = resourceFromSkillPath(abs);
    if (SKIP_SKILLS.includes(resourceName)) {
      if (parsed.json) {
        console.log(JSON.stringify([]));
      } else {
        console.log(`⏭️  ${abs} (pulado: SKIP_SKILLS)`);
      }
      process.exit(0);
    }
    const content = readFileSync(abs, 'utf-8');
    results.push({ file: abs, errors: lintSkill(resourceName, content) });
  } else {
    const files = findSkillFiles(skillsDir);
    for (const abs of files) {
      const resourceName = resourceFromSkillPath(abs);
      if (SKIP_SKILLS.includes(resourceName)) {
        if (!parsed.json) {
          console.log(`⏭️  ${abs} (pulado: SKIP_SKILLS)`);
        }
        continue;
      }
      const content = readFileSync(abs, 'utf-8');
      results.push({ file: abs, errors: lintSkill(resourceName, content) });
    }
  }

  if (parsed.json) {
    const flat = [];
    for (const { file, errors } of results) {
      for (const e of errors) {
        flat.push({ file, rule: e.rule, message: e.message });
      }
    }
    console.log(JSON.stringify(flat));
    process.exit(flat.length ? 1 : 0);
  }

  let failCount = 0;
  for (const { file, errors } of results) {
    if (errors.length === 0) {
      console.log(`✅ ${file}`);
    } else {
      console.error(`❌ ${file}:`);
      for (const e of errors) {
        console.error(`   ${e.rule}: ${e.message}`);
      }
      failCount += errors.length;
    }
  }

  process.exit(failCount ? 1 : 0);
}

if (isDirectExecution()) main();
