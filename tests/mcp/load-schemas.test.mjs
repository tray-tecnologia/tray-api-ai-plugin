// Calibração: contar JSON em skills/<skill>/schemas/ no ROOT — veja REPO_ROOT_EXPECTED_SCHEMA_COUNT.
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { findAllSchemas, loadSchema } from '../../mcp/lib/load-schemas.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');

// Smoke: neste workspace há 15 arquivos JSON em skills/<skill>/schemas/ (2026-05-14).
const REPO_ROOT_EXPECTED_SCHEMA_COUNT = 15;

const KNOWN_SCHEMA_BASE_NAMES = [
  'produto.create',
  'pedido.create',
  'webhook.payload',
  'cliente.update',
  'categoria.create',
  'marca.create',
  'variacao.create',
  'auth-request',
];

function writeSchemaFile(root, skillName, baseName, schemaObj) {
  const dir = join(root, 'skills', skillName, 'schemas');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${baseName}.json`), JSON.stringify(schemaObj));
}

function writeCanonicalLayout(root) {
  writeSchemaFile(root, 'produtos', 'produto.create', {
    title: 'ProdutoCreate',
    type: 'object',
    properties: { nome: { type: 'string' } },
  });
  writeSchemaFile(root, 'pedidos', 'pedido.create', {
    $id: 'https://example/pedido.create',
    type: 'object',
  });
  writeSchemaFile(root, 'webhooks', 'webhook.payload', {
    type: 'object',
    properties: { event: { type: 'string' } },
  });
  writeSchemaFile(root, 'clientes', 'cliente.update', { type: 'object' });
  writeSchemaFile(root, 'categorias', 'categoria.create', { type: 'object' });
  writeSchemaFile(root, 'marcas', 'marca.create', { type: 'object' });
  writeSchemaFile(root, 'variacoes', 'variacao.create', { type: 'object' });
  writeSchemaFile(root, 'autorizacao', 'auth-request', {
    type: 'object',
    properties: { consumer_key: { type: 'string' } },
  });
}

test('findAllSchemas(repo root) returns calibrated schema count', () => {
  const map = findAllSchemas(ROOT);
  assert.equal(
    map.size,
    REPO_ROOT_EXPECTED_SCHEMA_COUNT,
    `expected ${REPO_ROOT_EXPECTED_SCHEMA_COUNT} schemas under skills/*/schemas in repo root`
  );
});

test('each entry has absolute path and non-array object schema', () => {
  const map = findAllSchemas(ROOT);
  for (const [name, entry] of map) {
    assert.match(entry.path, /^\//);
    assert.equal(typeof entry.path, 'string');
    assert.ok(existsSync(entry.path), `path missing for ${name}`);
    assert.ok(entry.schema !== null && typeof entry.schema === 'object');
    assert.ok(!Array.isArray(entry.schema));
  }
});

test('canonical schema basenames are discoverable in a layout mirroring the plan', (t) => {
  const dir = mkdtempSync(join(os.tmpdir(), 'tray-load-schemas-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeCanonicalLayout(dir);

  const map = findAllSchemas(dir);
  assert.equal(map.size, KNOWN_SCHEMA_BASE_NAMES.length);
  for (const name of KNOWN_SCHEMA_BASE_NAMES) {
    assert.ok(map.has(name), `missing schema ${name}`);
  }
});

test('loadSchema returns the same entry reference as map.get', (t) => {
  const dir = mkdtempSync(join(os.tmpdir(), 'tray-load-schemas-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeCanonicalLayout(dir);

  const map = findAllSchemas(dir);
  const result = loadSchema('produto.create', map);
  assert.equal(map.get('produto.create'), result);
  const s = result.schema;
  assert.ok(
    s.title === 'ProdutoCreate' || s.$id || s.properties !== undefined,
    'expected identifiable produto.create schema shape'
  );
});

test('loadSchema throws SCHEMA_NOT_FOUND when name is missing', (t) => {
  const dir = mkdtempSync(join(os.tmpdir(), 'tray-load-schemas-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeCanonicalLayout(dir);
  const map = findAllSchemas(dir);

  assert.throws(
    () => loadSchema('inexistente', map),
    (err) =>
      err instanceof Error &&
      err.message.startsWith('SCHEMA_NOT_FOUND:'),
    'expected SCHEMA_NOT_FOUND prefix'
  );
});

test('findAllSchemas throws on basename collision listing both paths', (t) => {
  const dir = mkdtempSync(join(os.tmpdir(), 'tray-load-schemas-coll-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  writeSchemaFile(dir, 'foo', 'colision', { a: 1 });
  writeSchemaFile(dir, 'bar', 'colision', { b: 2 });

  assert.throws(
    () => findAllSchemas(dir),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /collision/i);
      assert.match(err.message, /foo[/\\].*colision\.json/);
      assert.match(err.message, /bar[/\\].*colision\.json/);
      return true;
    }
  );
});

test('skills without schemas/ are skipped; JSON outside schemas/ is ignored', (t) => {
  const dir = mkdtempSync(join(os.tmpdir(), 'tray-load-schemas-mixed-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  mkdirSync(join(dir, 'skills', 'sem_schemas'), { recursive: true });
  writeFileSync(join(dir, 'skills', 'sem_schemas', 'NOTE.txt'), 'no schemas dir');

  mkdirSync(join(dir, 'skills', 'lateral'), { recursive: true });
  writeFileSync(
    join(dir, 'skills', 'lateral', 'ignored.json'),
    JSON.stringify({ ignored: true })
  );

  writeSchemaFile(dir, 'com', 'only.one', { type: 'object' });

  const map = findAllSchemas(dir);
  assert.equal(map.size, 1);
  assert.ok(map.has('only.one'));
});
