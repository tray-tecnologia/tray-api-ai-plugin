import { test, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mockFetch, restoreFetch } from './helpers/mock-fetch.mjs';
import { loadOrFetch } from '../../scripts/lib/search-index.mjs';

const FAKE_HTML = `# API de Produtos

## POST /products

Cria produto.

\`\`\`shell
curl /products
\`\`\`
`;

let tmp;
beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), 'tray-cache-')); });
afterEach(() => { rmSync(tmp, { recursive: true, force: true }); restoreFetch(); });

test('loadOrFetch: cache miss + rede OK = fetch + write', async () => {
  mockFetch([{ body: FAKE_HTML, status: 200 }]);
  const r = await loadOrFetch({ cacheDir: tmp, ttlMs: 86400000, baseUrl: 'https://example' });
  assert.equal(r.cache.hit, false);
  assert.equal(r.cache.initial, true);
  assert.ok(r.index.documents.length >= 1);
});

test('loadOrFetch: cache hit não chama fetch', async () => {
  mockFetch([{ body: FAKE_HTML, status: 200 }]);
  await loadOrFetch({ cacheDir: tmp, ttlMs: 86400000, baseUrl: 'https://example' });
  const r2 = await loadOrFetch({ cacheDir: tmp, ttlMs: 86400000, baseUrl: 'https://example' });
  assert.equal(r2.cache.hit, true);
});

test('loadOrFetch: cache vencido + rede falha = stale + warning', async () => {
  mockFetch([{ body: FAKE_HTML, status: 200 }]);
  await loadOrFetch({ cacheDir: tmp, ttlMs: 1, baseUrl: 'https://example' });
  await new Promise(r => setTimeout(r, 5));
  mockFetch([{ error: 'network' }]);
  const r = await loadOrFetch({ cacheDir: tmp, ttlMs: 1, baseUrl: 'https://example' });
  assert.equal(r.cache.stale, true);
});

test('loadOrFetch: sem cache + rede falha = lança OFFLINE_NO_CACHE', async () => {
  mockFetch([{ error: 'down' }]);
  await assert.rejects(
    () => loadOrFetch({ cacheDir: tmp, ttlMs: 86400000, baseUrl: 'https://example' }),
    /OFFLINE_NO_CACHE/
  );
});
