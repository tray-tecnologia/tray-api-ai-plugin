import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePayload } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';
import create from '../../skills/categorias/schemas/categoria.create.json' with { type: 'json' };
import update from '../../skills/categorias/schemas/categoria.update.json' with { type: 'json' };

describe('categorias — categoria.create', () => {
  const v = (p) => validatePayload(create, p);

  test('válido — só name', () => assert.deepEqual(v({ name: 'Masculino' }), []));
  test('válido — com parent_id', () => assert.deepEqual(v({ name: 'Camisetas', parent_id: 5 }), []));
  test('válido — com active', () => assert.deepEqual(v({ name: 'X', active: 1 }), []));
  test('inválido — falta name', () => assert.equal(v({}).length, 1));
  test('inválido — name não-string', () => assert.equal(v({ name: 1 }).length, 1));
  test('inválido — parent_id string', () => assert.equal(v({ name: 'X', parent_id: '1' }).length, 1));
  test('inválido — active fora do enum', () => assert.equal(v({ name: 'X', active: 2 }).length, 1));
  test('inválido — extra', () => assert.equal(v({ name: 'X', extra: 1 }).length, 1));
  test('oracle: válido', () => {
    assertOracleAgrees(create, { name: 'X' }, validatePayload);
  });
});

describe('categorias — categoria.update', () => {
  const v = (p) => validatePayload(update, p);

  test('válido — só name', () => assert.deepEqual(v({ name: 'Y' }), []));
  test('válido — vazio', () => assert.deepEqual(v({}), []));
  test('inválido — type errado', () => assert.equal(v({ parent_id: '1' }).length, 1));
  test('inválido — extra', () => assert.equal(v({ name: 'Y', extra: 1 }).length, 1));
});
