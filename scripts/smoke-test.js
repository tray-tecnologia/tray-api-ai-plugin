#!/usr/bin/env node
/**
 * Smoke test do plugin tray-api-claude
 *
 * Valida a estrutura do plugin sem precisar de credenciais:
 *   1. JSON válido em manifests e hooks
 *   2. Frontmatter obrigatório em skills, agents e commands
 *   3. Campo `name` presente em todos os arquivos com frontmatter
 *   4. Sem rotas duplicadas dentro de referencia-api.md
 *   5. Skills referenciadas existem no disco
 *
 * Uso: node scripts/smoke-test.js
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

let errors = 0;
let warnings = 0;
let passed = 0;

function ok(msg) {
  console.log(`  ✅ ${msg}`);
  passed++;
}

function warn(msg) {
  console.warn(`  ⚠️  ${msg}`);
  warnings++;
}

function fail(msg) {
  console.error(`  ❌ ${msg}`);
  errors++;
}

function section(title) {
  console.log(`\n── ${title}`);
}

// ─── 1. JSON válido ────────────────────────────────────────────────────────────

section('1. Validação de JSON');

const jsonFiles = [
  'package.json',
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  '.cursor-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  'gemini-extension.json',
  'hooks/hooks.json',
];

for (const rel of jsonFiles) {
  const path = join(ROOT, rel);
  try {
    const content = readFileSync(path, 'utf-8');
    JSON.parse(content);
    ok(`${rel} — JSON válido`);
  } catch (e) {
    fail(`${rel} — JSON inválido: ${e.message}`);
  }
}

// ─── 2. Frontmatter obrigatório ────────────────────────────────────────────────

section('2. Frontmatter YAML obrigatório');

function getFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) fm[key.trim()] = rest.join(':').trim();
  }
  return fm;
}

function walkDir(dir, ext, callback) {
  let files;
  try { files = readdirSync(dir); } catch { return; }
  for (const f of files) {
    const full = join(dir, f);
    const stat = statSync(full);
    if (stat.isDirectory()) walkDir(full, ext, callback);
    else if (f.endsWith(ext)) callback(full, f);
  }
}

const checks = [
  { dir: join(ROOT, 'skills'), file: 'SKILL.md', required: ['name', 'description'] },
  { dir: join(ROOT, 'agents'), file: '.md', required: ['name', 'description'] },
  { dir: join(ROOT, 'commands'), file: '.md', required: ['name', 'description'] },
];

for (const { dir, file, required } of checks) {
  walkDir(dir, file === 'SKILL.md' ? 'SKILL.md' : '.md', (fullPath, fname) => {
    if (fname === 'AGENTES.md') return; // índice, sem frontmatter obrigatório
    const rel = fullPath.replace(ROOT + '/', '');
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const fm = getFrontmatter(content);
      if (!fm) {
        fail(`${rel} — sem frontmatter YAML`);
        return;
      }
      let allOk = true;
      for (const field of required) {
        if (!fm[field]) {
          fail(`${rel} — campo '${field}' ausente no frontmatter`);
          allOk = false;
        }
      }
      if (allOk) ok(`${rel} — frontmatter completo`);
    } catch (e) {
      fail(`${rel} — não foi possível ler: ${e.message}`);
    }
  });
}

// ─── 3. Rotas duplicadas em referencia-api.md ──────────────────────────────────

section('3. Rotas duplicadas em commands/referencia-api.md');

try {
  const refPath = join(ROOT, 'commands', 'referencia-api.md');
  const refContent = readFileSync(refPath, 'utf-8');

  // extrai linhas que contêm endpoints (backtick com /)
  const routePattern = /`((?:GET|POST|PUT|DELETE|PATCH)\s+[^`]+)`/g;
  const routes = [];
  let m;
  while ((m = routePattern.exec(refContent)) !== null) {
    routes.push(m[1].trim());
  }

  const seen = new Map();
  for (const route of routes) {
    if (seen.has(route)) {
      warn(`Rota duplicada: ${route}`);
    } else {
      seen.set(route, true);
    }
  }
  if (warnings === 0) ok(`${routes.length} rotas verificadas — sem duplicatas`);
} catch (e) {
  fail(`referencia-api.md — não foi possível ler: ${e.message}`);
}

// ─── 4. Skills na pasta existem no plugin.json ─────────────────────────────────

section('4. Consistência de skills no disco vs plugin.json');

try {
  const pluginPath = join(ROOT, '.claude-plugin', 'plugin.json');
  const pluginData = JSON.parse(readFileSync(pluginPath, 'utf-8'));
  const skillsDir = join(ROOT, 'skills');
  const skillsOnDisk = readdirSync(skillsDir).filter(
    (f) => statSync(join(skillsDir, f)).isDirectory()
  );

  ok(`${skillsOnDisk.length} pastas de skill encontradas no disco`);

  // verifica se plugin.json menciona os skills (campo plugins[0].description como proxy)
  const desc = pluginData?.plugins?.[0]?.description ?? '';
  const countMatch = desc.match(/(\d+)\s*skills/);
  if (countMatch) {
    const declared = parseInt(countMatch[1], 10);
    if (declared !== skillsOnDisk.length) {
      warn(
        `plugin.json declara ${declared} skills, mas há ${skillsOnDisk.length} pastas no disco`
      );
    } else {
      ok(`Contagem de skills consistente: ${declared}`);
    }
  }
} catch (e) {
  fail(`Verificação de skills — erro: ${e.message}`);
}

// ─── 5. Agentes no disco vs marketplace.json ───────────────────────────────────

section('5. Consistência de agentes no disco vs marketplace.json');

try {
  const marketPath = join(ROOT, '.claude-plugin', 'marketplace.json');
  const marketData = JSON.parse(readFileSync(marketPath, 'utf-8'));
  const desc = marketData?.plugins?.[0]?.description ?? '';

  const agentsRoot = readdirSync(join(ROOT, 'agents')).filter(
    (f) => f.endsWith('.md') && f !== 'AGENTES.md'
  );
  const agentsMigracao = readdirSync(join(ROOT, 'agents', 'migracao')).filter((f) =>
    f.endsWith('.md')
  );
  const totalAgents = agentsRoot.length + agentsMigracao.length;

  ok(`${totalAgents} agentes encontrados no disco (${agentsRoot.length} raiz + ${agentsMigracao.length} migracao)`);

  const countMatch = desc.match(/(\d+)\s*agentes/);
  if (countMatch) {
    const declared = parseInt(countMatch[1], 10);
    if (declared !== totalAgents) {
      warn(
        `marketplace.json declara ${declared} agentes, mas há ${totalAgents} no disco`
      );
    } else {
      ok(`Contagem de agentes consistente: ${declared}`);
    }
  } else {
    warn('marketplace.json não menciona contagem de agentes');
  }
} catch (e) {
  fail(`Verificação de agentes — erro: ${e.message}`);
}

// ─── 6. validate.mjs — payload válido ─────────────────────────────────────────

section('6. validate.mjs com payload válido');

const validPayloads = [
  { skill: 'produtos',    payload: '{"name":"Produto Teste","price":"99.90"}' },
  { skill: 'pedidos',     payload: '{"client_id":1,"products":[]}' },
  { skill: 'autorizacao', payload: '{"consumer_key":"abc","consumer_secret":"xyz","code":"123"}' },
  { skill: 'webhooks',    payload: '{"seller_id":100,"scope_id":200,"scope_name":"order","act":"insert"}' },
  { skill: 'clientes',    payload: '{"name":"João Silva","email":"joao@exemplo.com"}' },
];

for (const { skill, payload } of validPayloads) {
  const scriptPath = join(ROOT, 'skills', skill, 'scripts', 'validate.mjs');
  const result = spawnSync('node', [scriptPath, payload], { encoding: 'utf-8' });
  if (result.status === 0) {
    ok(`skills/${skill}/scripts/validate.mjs — payload válido aceito`);
  } else {
    fail(`skills/${skill}/scripts/validate.mjs — falhou com payload válido: ${result.stderr?.trim()}`);
  }
}

// ─── 7. validate.mjs — payload inválido ───────────────────────────────────────

section('7. validate.mjs com payload inválido (deve rejeitar)');

const invalidPayloads = [
  { skill: 'produtos',    payload: '{"price":"99.90"}',              expect: 'name ausente' },
  { skill: 'pedidos',     payload: '{"products":[]}',                expect: 'client_id ausente' },
  { skill: 'autorizacao', payload: '{"consumer_key":"abc"}',         expect: 'consumer_secret e code ausentes' },
  { skill: 'webhooks',    payload: '{"seller_id":100}',              expect: 'scope_id/scope_name/act ausentes' },
  { skill: 'clientes',    payload: '{"cpf":"12345678901"}',          expect: 'name e email ausentes' },
];

for (const { skill, payload, expect } of invalidPayloads) {
  const scriptPath = join(ROOT, 'skills', skill, 'scripts', 'validate.mjs');
  const result = spawnSync('node', [scriptPath, payload], { encoding: 'utf-8' });
  if (result.status === 1) {
    ok(`skills/${skill}/scripts/validate.mjs — rejeitou payload inválido (${expect})`);
  } else {
    fail(`skills/${skill}/scripts/validate.mjs — deveria rejeitar (${expect}) mas retornou exit ${result.status}`);
  }
}

// ─── 8. Seção "Antes de responder" em todos os SKILL.md ───────────────────────

section('8. Seção "## Antes de responder" em todos os SKILL.md');

let totalSection = 0;
let missingSection = 0;
walkDir(join(ROOT, 'skills'), 'SKILL.md', (fullPath) => {
  const rel = fullPath.replace(ROOT + '/', '');
  totalSection++;
  try {
    const content = readFileSync(fullPath, 'utf-8');
    if (!content.includes('## Antes de responder')) {
      fail(`${rel} — seção "## Antes de responder" ausente`);
      missingSection++;
    }
  } catch (e) {
    fail(`${rel} — não foi possível ler: ${e.message}`);
  }
});
if (missingSection === 0) ok(`${totalSection} SKILL.md contêm a seção "## Antes de responder"`);

// ─── 9. Campo when_not_to_use em todos os SKILL.md ────────────────────────────

section('9. Campo "when_not_to_use" no frontmatter de todos os SKILL.md');

let totalField = 0;
let missingField = 0;
walkDir(join(ROOT, 'skills'), 'SKILL.md', (fullPath) => {
  const rel = fullPath.replace(ROOT + '/', '');
  totalField++;
  try {
    const content = readFileSync(fullPath, 'utf-8');
    if (!content.includes('when_not_to_use:')) {
      fail(`${rel} — campo "when_not_to_use" ausente no frontmatter`);
      missingField++;
    }
  } catch (e) {
    fail(`${rel} — não foi possível ler: ${e.message}`);
  }
});
if (missingField === 0) ok(`${totalField} SKILL.md contêm o campo "when_not_to_use"`);

// ─── 10. Matcher do hook UserPromptSubmit cobre prompts PT-BR ─────────────────

section('10. Matcher do hook UserPromptSubmit (cobertura PT-BR)');

try {
  const result = spawnSync('node', [join(ROOT, 'scripts', 'test-prompt-matcher.mjs')], {
    encoding: 'utf-8',
  });
  if (result.status === 0) {
    ok('matcher de UserPromptSubmit casa todos os prompts esperados (Bloco 1, 5, 6) e ignora Bloco 4');
  } else {
    fail(`matcher de UserPromptSubmit falhou — rode 'node scripts/test-prompt-matcher.mjs' para detalhes`);
    if (result.stdout) console.error(result.stdout.split('\n').filter(l => l.includes('❌')).map(l => '    ' + l).join('\n'));
  }
} catch (e) {
  fail(`Verificação de matcher — erro: ${e.message}`);
}

// ─── Resultado final ───────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
console.log(`Resultado: ${passed} ok  |  ${warnings} avisos  |  ${errors} erros`);
console.log('─'.repeat(50));

if (errors > 0) {
  console.error('\n🔴 Smoke test FALHOU — corrija os erros acima antes de publicar.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.warn('\n🟡 Smoke test passou com avisos — verifique os itens acima.\n');
  process.exit(0);
} else {
  console.log('\n🟢 Smoke test passou sem erros.\n');
  process.exit(0);
}
