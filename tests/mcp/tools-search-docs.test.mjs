import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mockFetch, restoreFetch, pendingResponses } from '../search/helpers/mock-fetch.mjs';
import { SAMPLE_MD } from '../search/helpers/fixtures.mjs';
import {
  searchDocsToolDefinition,
  searchDocsInputSchema,
  handleSearchDocs,
  _resetCache,
} from '../../mcp/tools/search-docs.mjs';

let tmpCacheDir;

beforeEach(() => {
  _resetCache();
  tmpCacheDir = mkdtempSync(join(tmpdir(), 'mcp-search-'));
});

afterEach(() => {
  restoreFetch();
  rmSync(tmpCacheDir, { recursive: true, force: true });
});

describe('mcp tray.search_docs', () => {
  test('tool definition correta', () => {
    assert.equal(searchDocsToolDefinition.name, 'tray.search_docs');
    assert.ok(Array.isArray(searchDocsToolDefinition.inputSchema.required));
    assert.ok(searchDocsToolDefinition.inputSchema.required.includes('query'));
    assert.equal(typeof searchDocsToolDefinition.description, 'string');
    assert.ok(searchDocsToolDefinition.description.length > 0);
    assert.ok(searchDocsInputSchema);
  });

  test('query OK com fetch mockado', async () => {
    mockFetch([{ body: SAMPLE_MD, status: 200 }]);
    const res = await handleSearchDocs(
      { query: 'autenticação' },
      { cacheDir: tmpCacheDir, ttlMs: 60_000, baseUrl: 'https://x.local/' }
    );
    assert.equal(res.isError, undefined);
    assert.ok(res.content?.[0]?.text);
    const body = JSON.parse(res.content[0].text);
    assert.ok(body.results.length >= 1);
    assert.equal(body.query, 'autenticação');
    assert.equal(typeof body.cache, 'object');
    assert.notEqual(body.cache, null);
  });

  test('topic válido retorna topic no body', async () => {
    mockFetch([{ body: SAMPLE_MD, status: 200 }]);
    const res = await handleSearchDocs(
      { query: 'autorização', topic: 'autorizacao' },
      { cacheDir: tmpCacheDir, ttlMs: 60_000, baseUrl: 'https://x.local/' }
    );
    assert.equal(res.isError, undefined);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.topic, 'autorizacao');
  });

  test('topic inválido → INVALID_TOPIC', async () => {
    const res = await handleSearchDocs({ query: 'oi', topic: 'inexistente' });
    assert.equal(res.isError, true);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.error, 'INVALID_TOPIC');
    assert.ok(Array.isArray(body.available));
    assert.ok(body.available.includes('produtos'));
  });

  test('query vazia → INVALID_INPUT', async () => {
    const res = await handleSearchDocs({ query: '' });
    assert.equal(res.isError, true);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.error, 'INVALID_INPUT');
  });

  test('modo offline sem cache → OFFLINE_NO_CACHE', async () => {
    mockFetch([{ error: 'ECONNREFUSED', errorCode: 'ECONNREFUSED' }]);
    const res = await handleSearchDocs(
      { query: 'oi' },
      { cacheDir: tmpCacheDir, ttlMs: 60_000, baseUrl: 'https://x.local/' }
    );
    assert.equal(res.isError, true);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.error, 'OFFLINE_NO_CACHE');
  });

  test('limit respeitado', async () => {
    mockFetch([{ body: SAMPLE_MD, status: 200 }]);
    const res = await handleSearchDocs(
      { query: 'a', limit: 2 },
      { cacheDir: tmpCacheDir, ttlMs: 60_000, baseUrl: 'https://x.local/' }
    );
    assert.equal(res.isError, undefined);
    const body = JSON.parse(res.content[0].text);
    assert.ok(body.results.length <= 2);
    assert.equal(body.limit, 2);
  });

  test('cache memoizado entre chamadas não re-consome fetch', async () => {
    mockFetch([{ body: SAMPLE_MD, status: 200 }]);
    const opts = { cacheDir: tmpCacheDir, ttlMs: 60_000, baseUrl: 'https://x.local/' };
    await handleSearchDocs({ query: 'autenticação' }, opts);
    assert.equal(pendingResponses(), 0);
    const res2 = await handleSearchDocs({ query: 'oauth' }, opts);
    assert.equal(res2.isError, undefined);
    assert.equal(pendingResponses(), 0);
  });
});
