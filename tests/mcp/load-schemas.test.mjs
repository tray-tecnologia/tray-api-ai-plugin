import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findAllSchemas, loadSchema } from '../../mcp/lib/load-schemas.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');

const KNOWN_SCHEMAS = [
  'produto.create',
  'produto.update',
  'pedido.create',
  'pedido.update',
  'cliente.create',
  'cliente.update',
  'webhook.payload',
  'variacao.create',
  'variacao.update',
  'categoria.create',
  'categoria.update',
  'marca.create',
  'marca.update',
  'auth-request',
  'auth-refresh',
];

describe('findAllSchemas', () => {
  test('retorna Map com 15 schemas no repositório', () => {
    const map = findAllSchemas(ROOT);
    assert.equal(map.size, 15);
  });

  test('cada entry tem path absoluto existente e schema objeto não-array', () => {
    const map = findAllSchemas(ROOT);
    for (const [, entry] of map) {
      assert.equal(typeof entry.path, 'string');
      assert.ok(existsSync(entry.path));
      assert.equal(resolve(entry.path), entry.path);
      assert.ok(entry.schema !== null && typeof entry.schema === 'object');
      assert.ok(!Array.isArray(entry.schema));
    }
  });

  test('schemas conhecidos estão presentes', () => {
    const map = findAllSchemas(ROOT);
    for (const name of KNOWN_SCHEMAS) {
      assert.ok(map.has(name), `missing schema: ${name}`);
    }
  });

  test('dir sem pasta skills retorna Map vazia', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'load-schemas-no-skills-'));
    try {
      const map = findAllSchemas(tmp);
      assert.equal(map.size, 0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('skill sem schemas/ é ignorada', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'load-schemas-skip-'));
    try {
      mkdirSync(join(tmp, 'skills', 'sem-schemas', 'SKILL.md'), { recursive: true });
      mkdirSync(join(tmp, 'skills', 'com-schemas', 'schemas'), { recursive: true });
      writeFileSync(
        join(tmp, 'skills', 'com-schemas', 'schemas', 'only.one.json'),
        '{"x":1}',
      );
      const map = findAllSchemas(tmp);
      assert.equal(map.size, 1);
      assert.ok(map.has('only.one'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('lança quando dois arquivos têm o mesmo basename (colisão)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'load-schemas-collision-'));
    const pFoo = resolve(tmp, 'skills', 'foo', 'schemas', 'colision.json');
    const pBar = resolve(tmp, 'skills', 'bar', 'schemas', 'colision.json');
    try {
      mkdirSync(dirname(pFoo), { recursive: true });
      mkdirSync(dirname(pBar), { recursive: true });
      writeFileSync(pFoo, '{"a":1}');
      writeFileSync(pBar, '{"b":2}');
      assert.throws(
        () => findAllSchemas(tmp),
        (err) => {
          assert.ok(err instanceof Error);
          assert.match(err.message, /colis|collision/i);
          assert.ok(err.message.includes(pFoo), err.message);
          assert.ok(err.message.includes(pBar), err.message);
          return true;
        },
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('loadSchema', () => {
  test('retorna a mesma entry que map.get para nome existente', () => {
    const map = findAllSchemas(ROOT);
    const viaLoad = loadSchema('produto.create', map);
    const viaGet = map.get('produto.create');
    assert.deepEqual(viaLoad, viaGet);
    assert.strictEqual(viaLoad, viaGet);
  });

  test('lança SCHEMA_NOT_FOUND para nome inexistente', () => {
    const map = findAllSchemas(ROOT);
    assert.throws(
      () => loadSchema('inexistente', map),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.startsWith('SCHEMA_NOT_FOUND:'), err.message);
        return true;
      },
    );
  });
});
