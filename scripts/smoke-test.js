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
 *   ...
 *  13. tray-dev — search smoke (fixture mockada)
 *  14. lint-skills — bloco MANDATORY em todos os SKILL.md
 *
 * Uso: node scripts/smoke-test.js
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
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

// ─── 6. validate.mjs com payload válido (multi-schema) ────────────────────────

section('6. validate.mjs com payload válido (multi-schema)');

const validateSkills = {
  autorizacao: {
    'auth-request': '{"AuthRequest":{"consumer_key":"k","consumer_secret":"s","code":"c"}}',
    'auth-refresh': '{"AuthRefresh":{"consumer_key":"k","refresh_token":"rt"}}',
  },
  produtos: {
    'produto.create': '{"Product":{"name":"X","price":1}}',
    'produto.update': '{"Product":{"price":2}}',
  },
  pedidos: {
    'pedido.create': '{"Order":{"customer_id":1,"products":[{"product_id":1,"quantity":1}]}}',
    'pedido.update': '{"Order":{"status_id":5}}',
  },
  clientes: {
    'cliente.create': '{"Customer":{"name":"A","email":"a@b.com"}}',
    'cliente.update': '{"Customer":{"email":"novo@x.com"}}',
  },
  webhooks: {
    'webhook.payload': '{"Webhook":{"seller_id":1,"scope_id":1,"scope_name":"order","act":"insert"}}',
  },
  variacoes: {
    'variacao.create': '{"Variant":{"sku":"X","price":1}}',
    'variacao.update': '{"Variant":{"price":2}}',
  },
  categorias: {
    'categoria.create': '{"Category":{"name":"Masc"}}',
    'categoria.update': '{"Category":{"name":"Y"}}',
  },
  marcas: {
    'marca.create': '{"Brand":{"name":"Nike"}}',
    'marca.update': '{"Brand":{"slug":"nike"}}',
  },
};

for (const [skill, schemas] of Object.entries(validateSkills)) {
  for (const [schemaName, validPayload] of Object.entries(schemas)) {
    const scriptPath = join(ROOT, 'skills', skill, 'scripts', 'validate.mjs');
    const result = spawnSync('node', [scriptPath, `--schema=${schemaName}`, validPayload], { encoding: 'utf-8' });
    if (result.status === 0) {
      ok(`skills/${skill}/scripts/validate.mjs --schema=${schemaName} — payload válido aceito`);
    } else {
      fail(`skills/${skill}/scripts/validate.mjs --schema=${schemaName} — falhou: ${result.stderr?.trim()}`);
    }
  }
}

// ─── 7. validate.mjs com payload inválido (multi-schema) ──────────────────────

section('7. validate.mjs com payload inválido (deve rejeitar)');

const invalidPayloads = {
  autorizacao: {
    'auth-request': ['{"AuthRequest":{"consumer_key":"k"}}', 'falta consumer_secret/code'],
    'auth-refresh': ['{"AuthRefresh":{"consumer_key":"k"}}', 'falta refresh_token'],
  },
  produtos: {
    'produto.create': ['{"Product":{"price":1}}', 'falta name'],
    'produto.update': ['{"Product":{"price":"abc"}}', 'price string'],
  },
  pedidos: {
    'pedido.create': ['{"Order":{"customer_id":1}}', 'falta products'],
    'pedido.update': ['{"Order":{"status_id":"5"}}', 'status_id string'],
  },
  clientes: {
    'cliente.create': ['{"Customer":{"name":"A"}}', 'falta email'],
    'cliente.update': ['{"Customer":{"email":"sem-arroba"}}', 'email malformado'],
  },
  webhooks: {
    'webhook.payload': ['{"Webhook":{"seller_id":1,"scope_id":1,"scope_name":"order"}}', 'falta act'],
  },
  variacoes: {
    'variacao.create': ['{"Variant":{"sku":"X"}}', 'falta price'],
    'variacao.update': ['{"Variant":{"price":-1}}', 'price negativo'],
  },
  categorias: {
    'categoria.create': ['{"Category":{}}', 'falta name'],
    'categoria.update': ['{"Category":{"parent_id":"1"}}', 'parent_id string'],
  },
  marcas: {
    'marca.create': ['{"Brand":{}}', 'falta name'],
    'marca.update': ['{"Brand":{"slug":"with space"}}', 'slug com espaço'],
  },
};

for (const [skill, schemas] of Object.entries(invalidPayloads)) {
  for (const [schemaName, [payload, expect]] of Object.entries(schemas)) {
    const scriptPath = join(ROOT, 'skills', skill, 'scripts', 'validate.mjs');
    const result = spawnSync('node', [scriptPath, `--schema=${schemaName}`, payload], { encoding: 'utf-8' });
    if (result.status === 1) {
      ok(`skills/${skill}/scripts/validate.mjs --schema=${schemaName} — rejeitou (${expect})`);
    } else {
      fail(`skills/${skill}/scripts/validate.mjs --schema=${schemaName} — deveria rejeitar (${expect}) mas exit=${result.status}`);
    }
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

// ─── 10. UserPromptSubmit ausente de hooks.json ───────────────────────────────
// O hook UserPromptSubmit foi removido: contexto Tray vive em CLAUDE.md/GEMINI.md.
// Hooks LLM em UserPromptSubmit são não-determinísticos e causam bloqueios falsos
// em prompts não relacionados à API Tray.

section('10. UserPromptSubmit ausente de hooks.json (regressão)');

try {
  const hooksJson = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
  if (hooksJson.hooks && hooksJson.hooks.UserPromptSubmit) {
    fail('hooks.json contém UserPromptSubmit — deve ser removido (usa CLAUDE.md para contexto Tray)');
  } else {
    ok('hooks.json não contém UserPromptSubmit — contexto Tray via CLAUDE.md/GEMINI.md');
  }
} catch (e) {
  fail(`Verificação de UserPromptSubmit — erro: ${e.message}`);
}

// ─── 11. Contrato {ok, reason} em hooks do tipo "prompt" ──────────────────────
//
// Schema oficial documentado em:
//   - https://code.claude.com/docs/en/hooks#prompt-based-hooks
//   - https://cursor.com/docs/hooks.md (Prompt-Based Hooks)
//
// Toda LLM invocada via type:"prompt" DEVE retornar JSON {"ok": true|false, "reason": "..."}.
// Prompts que instruem "não responda" violam o contrato e disparam
// `hook stopped continuation` quando a LLM tenta cumprir gerando prosa.
// Hooks puramente informativos (que injetam contexto sem decidir) são exceção
// e devem declarar explicitamente que NÃO bloqueiam o fluxo.

section('11. Contrato {ok, reason} em hooks tipo "prompt"');

try {
  const hooksData = JSON.parse(readFileSync(join(ROOT, 'hooks', 'hooks.json'), 'utf-8'));
  const promptHooks = [];
  for (const [event, groups] of Object.entries(hooksData.hooks ?? {})) {
    for (const group of groups) {
      for (const handler of group.hooks ?? []) {
        if (handler.type === 'prompt') {
          promptHooks.push({ event, matcher: group.matcher ?? '*', prompt: handler.prompt ?? '' });
        }
      }
    }
  }

  if (promptHooks.length === 0) {
    ok('Nenhum hook do tipo "prompt" no plugin');
  } else {
    for (const { event, matcher, prompt } of promptHooks) {
      const isInformative =
        /informativ/i.test(prompt) &&
        /(n[ãa]o|nunca|jamais).{0,40}(interromp|bloque|recus)/i.test(prompt);
      const declaresOkSchema = /"ok"\s*:/.test(prompt);
      const instructsSilence = /n[ãa]o.{0,20}responda/i.test(prompt);

      if (isInformative && !instructsSilence) {
        ok(`${event}/${matcher} — hook informativo (não decide, não bloqueia)`);
      } else if (declaresOkSchema && !instructsSilence) {
        ok(`${event}/${matcher} — declara contrato {ok, reason}`);
      } else if (instructsSilence) {
        fail(
          `${event}/${matcher} — prompt instrui "não responda" mas o schema oficial exige sempre retornar {"ok": true|false, "reason": "..."}. Isso causa 'hook stopped continuation'.`
        );
      } else {
        fail(
          `${event}/${matcher} — não declara o contrato {"ok": ..., "reason": ...} nem se identifica como informativo. Risco de 'hook stopped continuation'.`
        );
      }
    }
  }
} catch (e) {
  fail(`Verificação de contrato {ok, reason} — erro: ${e.message}`);
}

// ─── 12. lint-schemas em todos os schemas ─────────────────────────────────────

section('12. lint-schemas em todos os schemas');

const lintResult = spawnSync('node', [join(ROOT, 'scripts', 'lint-schemas.mjs')], { encoding: 'utf-8' });
if (lintResult.status === 0) {
  ok(`lint-schemas passou em todos os schemas`);
} else {
  fail(`lint-schemas falhou:\n${lintResult.stdout}\n${lintResult.stderr}`);
}

// ─── 13. tray-dev — search smoke (fixture mockada) ─────────────────────────────

section('13. Search docs (tray-dev) — smoke');

const tmpDir = mkdtempSync(join(tmpdir(), 'tray-search-smoke-'));
try {
  const fakeIdx = {
    version: '1.0.0',
    documents: [
      {
        id: 'gerar-chaves',
        h1: 'Autorização',
        title: 'Gerar Chaves de Acesso',
        level: 'h2',
        anchor: 'gerar-chaves',
        body: 'Use OAuth 2.0 para autenticar',
        code: [],
        tokens: {
          title: ['ger', 'chav', 'acess'],
          code: [],
          body: ['us', 'oauth', '2', '0', 'autentic'],
        },
        length: 8,
      },
      {
        id: 'post-products',
        h1: 'API de Produtos',
        title: 'POST /products',
        level: 'h2',
        anchor: 'post-products',
        body: 'Cria produto novo',
        code: [],
        tokens: {
          title: ['post', 'product'],
          code: [],
          body: ['cri', 'produt', 'nov'],
        },
        length: 5,
      },
    ],
    docFreq: {
      ger: 1,
      chav: 1,
      acess: 1,
      us: 1,
      oauth: 1,
      '2': 1,
      '0': 1,
      autentic: 1,
      post: 1,
      product: 1,
      cri: 1,
      produt: 1,
      nov: 1,
    },
    avgdl: 6.5,
    N: 2,
  };
  writeFileSync(join(tmpDir, 'raw.html'), '# Autorização\n\n## Gerar Chaves de Acesso\nUse OAuth 2.0\n', 'utf8');
  writeFileSync(join(tmpDir, 'parsed.md'), '', 'utf8');
  writeFileSync(join(tmpDir, 'index.json'), JSON.stringify(fakeIdx), 'utf8');
  writeFileSync(
    join(tmpDir, 'metadata.json'),
    JSON.stringify({
      fetchedAt: new Date().toISOString(),
      ttlMs: 86400000,
      sourceHash: 'sha256:smoke',
      indexVersion: '1.0.0',
    }),
    'utf8'
  );

  const env = { ...process.env, TRAY_DOCS_CACHE_DIR: tmpDir };
  const SCRIPT = join(ROOT, 'skills', 'tray-dev', 'scripts', 'search_docs.mjs');

  const r1 = spawnSync('node', [SCRIPT, '--list-topics'], { env, encoding: 'utf8', cwd: ROOT });
  if (r1.status === 0 && r1.stdout.includes('produtos')) ok('13.1 --list-topics ok');
  else fail(`13.1 --list-topics falhou (exit=${r1.status})`);

  const r2 = spawnSync('node', [SCRIPT, '--json', 'oauth'], { env, encoding: 'utf8', cwd: ROOT });
  let d2;
  try {
    d2 = JSON.parse(r2.stdout);
  } catch {
    d2 = null;
  }
  if (r2.status === 0 && d2 && d2.results.length >= 1) ok('13.2 query "oauth" retorna >=1 resultado');
  else fail(`13.2 query oauth falhou (exit=${r2.status})`);

  const r3 = spawnSync('node', [SCRIPT, '--json', 'palavraqueeunaoexiste9999'], {
    env,
    encoding: 'utf8',
    cwd: ROOT,
  });
  let d3;
  try {
    d3 = JSON.parse(r3.stdout);
  } catch {
    d3 = null;
  }
  if (r3.status === 0 && d3 && d3.results.length === 0)
    ok('13.3 query inexistente retorna 0 (exit 0)');
  else fail(`13.3 query inexistente falhou (exit=${r3.status})`);

  const r4 = spawnSync('node', [SCRIPT, '--topic=produtos', '--json', 'post'], {
    env,
    encoding: 'utf8',
    cwd: ROOT,
  });
  let d4;
  try {
    d4 = JSON.parse(r4.stdout);
  } catch {
    d4 = null;
  }
  if (
    r4.status === 0 &&
    d4 &&
    (d4.results.length === 0 || d4.results.every((r) => r.topic === 'produtos'))
  )
    ok('13.4 --topic=produtos filtra corretamente');
  else fail(`13.4 --topic=produtos falhou (exit=${r4.status})`);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

// ─── 14. lint-skills em todos os SKILL.md ─────────────────────────────────────

console.log('\n[14] lint-skills (bloco MANDATORY em todas as skills):');

const lintSkillsResult = spawnSync('node', ['scripts/lint-skills.mjs'], {
  cwd: ROOT,
  encoding: 'utf-8',
});

if (lintSkillsResult.status === 0) {
  ok('lint-skills passou em todas as skills');
} else {
  fail(
    `lint-skills falhou (exit=${lintSkillsResult.status}):\n${lintSkillsResult.stdout}\n${lintSkillsResult.stderr}`
  );
}

// ─── 15. MCP server smoke (stdio com 3 requests JSON-RPC) ─────────────────────

console.log('\n[15] MCP server smoke (stdio):');

try {
  const initReq = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'smoke', version: '1.0' },
    },
  };
  const initNotif = { jsonrpc: '2.0', method: 'notifications/initialized' };
  const listReq = { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} };
  const callReq = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'tray.validate',
      arguments: { schema: 'inexistente', payload: {} },
    },
  };
  const stdin = [
    JSON.stringify(initReq),
    JSON.stringify(initNotif),
    JSON.stringify(listReq),
    JSON.stringify(callReq),
    '',
  ].join('\n');

  const child = spawnSync('node', ['mcp/server.mjs'], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 8000,
    input: stdin,
  });

  const responses = child.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (responses.length >= 3) {
    ok(`15.1 server stdio respondeu ${responses.length} mensagens JSON-RPC`);
  } else {
    fail(
      `15.1 server respondeu apenas ${responses.length} mensagens; stdout: ${child.stdout.slice(0, 200)}; stderr: ${child.stderr.slice(0, 200)}`
    );
  }

  const listResp = responses.find((r) => r.id === 2);
  if (listResp?.result?.tools?.length === 2) {
    ok('15.2 ListTools retorna exatamente 2 tools');
  } else {
    fail(`15.2 ListTools não retornou 2 tools: ${JSON.stringify(listResp)}`);
  }

  const callResp = responses.find((r) => r.id === 3);
  if (callResp?.result?.isError === true) {
    ok('15.3 CallTool com schema inválido retorna isError:true');
  } else {
    fail(`15.3 CallTool não retornou isError: ${JSON.stringify(callResp)}`);
  }
} catch (e) {
  fail(`15 erro inesperado: ${e.message}`);
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
