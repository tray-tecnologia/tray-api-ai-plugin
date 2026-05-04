import { test, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeCache, readCache, isFresh, clearCache, hashContent } from '../../scripts/lib/docs-cache.mjs';

let tmp;
beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), 'tray-cache-')); });
afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

test('cache: writeCache cria arquivos esperados', async () => {
  await writeCache(tmp, { raw: '# A', parsed: '#A', index: { version: '1.0.0', documents: [] } }, 86400000);
  assert.ok(existsSync(join(tmp, 'raw.html')));
  assert.ok(existsSync(join(tmp, 'parsed.md')));
  assert.ok(existsSync(join(tmp, 'index.json')));
  assert.ok(existsSync(join(tmp, 'metadata.json')));
});

test('cache: readCache retorna null se não existe', async () => {
  assert.equal(await readCache('/tmp/inexistente-xyz-123987'), null);
});

test('cache: readCache retorna estado quando existe', async () => {
  await writeCache(tmp, { raw: '# A', parsed: '#A', index: { documents: [{ id: 'x' }] } }, 86400000);
  const c = await readCache(tmp);
  assert.ok(c);
  assert.equal(c.raw, '# A');
  assert.equal(c.parsed, '#A');
  assert.deepEqual(c.index.documents, [{ id: 'x' }]);
  assert.ok(c.metadata.fetchedAt);
  assert.equal(c.metadata.ttlMs, 86400000);
});

test('cache: isFresh true quando idade < TTL', () => {
  const now = Date.now();
  assert.equal(isFresh({ fetchedAt: new Date(now - 1000).toISOString(), ttlMs: 86400000 }), true);
});

test('cache: isFresh false quando idade > TTL', () => {
  const now = Date.now();
  assert.equal(isFresh({ fetchedAt: new Date(now - 100000).toISOString(), ttlMs: 1000 }), false);
});

test('cache: clearCache remove diretório', async () => {
  await writeCache(tmp, { raw: 'a', parsed: 'a', index: {} }, 1000);
  assert.ok(existsSync(join(tmp, 'metadata.json')));
  await clearCache(tmp);
  assert.ok(!existsSync(join(tmp, 'metadata.json')));
});

test('cache: hashContent é determinístico', () => {
  assert.equal(hashContent('abc'), hashContent('abc'));
  assert.notEqual(hashContent('abc'), hashContent('abd'));
  assert.equal(typeof hashContent('x'), 'string');
  assert.ok(hashContent('x').startsWith('sha256:'));
});

test('cache: metadata grava sourceHash quando informado', async () => {
  await writeCache(tmp, { raw: 'XYZ', parsed: '', index: {} }, 1000);
  const c = await readCache(tmp);
  assert.equal(c.metadata.sourceHash, hashContent('XYZ'));
});
