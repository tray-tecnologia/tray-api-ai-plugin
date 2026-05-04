import { test, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../skills/tray-dev/scripts/search_docs.mjs', import.meta.url));

function run(args, env = {}) {
  return spawnSync('node', [SCRIPT, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8'
  });
}

function makeFixtureCache(tmp) {
  writeFileSync(join(tmp, 'raw.html'), `# API de Produtos\n\n## POST /products\n\nCria produto novo com nome.\n`, 'utf8');
  writeFileSync(join(tmp, 'parsed.md'), '', 'utf8');
  const index = {
    version: '1.0.0',
    documents: [
      {
        id: 'post-products',
        h1: 'API de Produtos',
        title: 'POST /products',
        level: 'h2',
        anchor: 'post-products',
        body: 'Cria produto novo com nome.',
        code: [],
        tokens: { title: ['post','product'], code: [], body: ['cri','produt','nov','nom'] },
        length: 6
      }
    ],
    docFreq: { post: 1, product: 1, cri: 1, produt: 1, nov: 1, nom: 1 },
    avgdl: 6,
    N: 1
  };
  writeFileSync(join(tmp, 'index.json'), JSON.stringify(index), 'utf8');
  writeFileSync(join(tmp, 'metadata.json'), JSON.stringify({
    fetchedAt: new Date().toISOString(),
    ttlMs: 86400000,
    sourceHash: 'sha256:abc',
    indexVersion: '1.0.0'
  }), 'utf8');
}

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'tray-cache-'));
  makeFixtureCache(tmp);
});
afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

test('CLI: --help retorna 0', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('search_docs') || r.stderr.includes('search_docs'));
});

test('CLI: --list-topics lista topicos', () => {
  const r = run(['--list-topics']);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('produtos'));
  assert.ok(r.stdout.includes('autorizacao'));
});

test('CLI: query OK com cache fixture (humano)', () => {
  const r = run(['produtos'], { TRAY_DOCS_CACHE_DIR: tmp });
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('POST /products'));
});

test('CLI: query OK com --json', () => {
  const r = run(['--json', 'produto'], { TRAY_DOCS_CACHE_DIR: tmp });
  assert.equal(r.status, 0);
  const data = JSON.parse(r.stdout);
  assert.equal(data.query, 'produto');
  assert.ok(Array.isArray(data.results));
  assert.ok(typeof data.took === 'number');
});

test('CLI: query vazia exit 2', () => {
  const r = run([''], { TRAY_DOCS_CACHE_DIR: tmp });
  assert.equal(r.status, 2);
});

test('CLI: --topic inexistente exit 2', () => {
  const r = run(['--topic=xyz', 'foo'], { TRAY_DOCS_CACHE_DIR: tmp });
  assert.equal(r.status, 2);
  assert.ok(r.stderr.includes('topic'));
});

test('CLI: 0 results retorna exit 0 com array vazio', () => {
  const r = run(['--json', 'palavraqueeunaoexiste9999'], { TRAY_DOCS_CACHE_DIR: tmp });
  assert.equal(r.status, 0);
  const data = JSON.parse(r.stdout);
  assert.deepEqual(data.results, []);
});

test('CLI: --topic=produtos com query funciona', () => {
  const r = run(['--topic=produtos', '--json', 'POST'], { TRAY_DOCS_CACHE_DIR: tmp });
  assert.equal(r.status, 0);
  const data = JSON.parse(r.stdout);
  for (const item of data.results) {
    assert.equal(item.topic, 'produtos');
  }
});

test('CLI: --limit=1 limita resultados', () => {
  const r = run(['--json', '--limit=1', 'produto'], { TRAY_DOCS_CACHE_DIR: tmp });
  assert.equal(r.status, 0);
  const data = JSON.parse(r.stdout);
  assert.ok(data.results.length <= 1);
});

test('CLI: flag desconhecida exit 2', () => {
  const r = run(['--xpto', 'q'], { TRAY_DOCS_CACHE_DIR: tmp });
  assert.equal(r.status, 2);
});
