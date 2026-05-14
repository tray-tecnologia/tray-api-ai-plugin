/**
 * Testes in-process do servidor MCP (createServer + InMemoryTransport).
 */
import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mockFetch, restoreFetch } from '../search/helpers/mock-fetch.mjs';
import { SAMPLE_MD } from '../search/helpers/fixtures.mjs';
import { createServer } from '../../mcp/server.mjs';
import { _resetCache } from '../../mcp/tools/search-docs.mjs';

let client;
let server;
let trayDocsCacheDirPrev;
let wsCacheDir;

describe('mcp server (in-process)', () => {
  beforeEach(async () => {
    _resetCache();
    trayDocsCacheDirPrev = process.env.TRAY_DOCS_CACHE_DIR;
    wsCacheDir = mkdtempSync(join(process.cwd(), 'tmp-mcp-server-it-'));
    process.env.TRAY_DOCS_CACHE_DIR = wsCacheDir;

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    server = await createServer();
    await server.connect(serverTransport);

    client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    restoreFetch();
    await client?.close().catch(() => {});
    await server?.close().catch(() => {});
    if (wsCacheDir) {
      try {
        rmSync(wsCacheDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      wsCacheDir = undefined;
    }
    if (trayDocsCacheDirPrev === undefined) {
      delete process.env.TRAY_DOCS_CACHE_DIR;
    } else {
      process.env.TRAY_DOCS_CACHE_DIR = trayDocsCacheDirPrev;
    }
    trayDocsCacheDirPrev = undefined;
  });

  test('listTools retorna exatamente tray.search_docs e tray.validate', async () => {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 2);
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, ['tray.search_docs', 'tray.validate']);
  });

  test('listTools: cada tool tem inputSchema não vazio', async () => {
    const { tools } = await client.listTools();
    for (const t of tools) {
      assert.ok(t.inputSchema && typeof t.inputSchema === 'object');
      assert.ok(Object.keys(t.inputSchema).length > 0, `inputSchema vazio: ${t.name}`);
    }
  });

  test('callTool tray.validate com produto.create válido → valid true', async () => {
    const result = await client.callTool({
      name: 'tray.validate',
      arguments: {
        schema: 'produto.create',
        payload: { Product: { name: 'Camisa', price: 99 } },
      },
    });
    assert.notEqual(result.isError, true);
    const body = JSON.parse(result.content[0].text);
    assert.equal(body.valid, true);
  });

  test('callTool tray.validate com schema desconhecido → SCHEMA_NOT_FOUND', async () => {
    const result = await client.callTool({
      name: 'tray.validate',
      arguments: { schema: 'inexistente', payload: {} },
    });
    assert.equal(result.isError, true);
    const body = JSON.parse(result.content[0].text);
    assert.equal(body.error, 'SCHEMA_NOT_FOUND');
  });

  test('callTool tray.search_docs com mock fetch retorna resultados', async () => {
    mockFetch([{ body: SAMPLE_MD, status: 200 }]);
    const result = await client.callTool({
      name: 'tray.search_docs',
      arguments: { query: 'autenticação' },
    });
    assert.notEqual(result.isError, true);
    const body = JSON.parse(result.content[0].text);
    assert.ok(Array.isArray(body.results));
    assert.ok(body.results.length >= 1);
  });

  test('callTool tray.unknown → UNKNOWN_TOOL ou rejeição client-side', async () => {
    try {
      const result = await client.callTool({ name: 'tray.unknown', arguments: {} });
      assert.equal(result.isError, true);
      assert.equal(JSON.parse(result.content[0].text).error, 'UNKNOWN_TOOL');
    } catch (e) {
      assert.match(e.message ?? '', /tool|method|unknown/i);
    }
  });
});
