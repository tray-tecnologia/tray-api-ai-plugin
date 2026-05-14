import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePayload } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';
import create from '../../skills/variacoes/schemas/variacao.create.json' with { type: 'json' };
import update from '../../skills/variacoes/schemas/variacao.update.json' with { type: 'json' };

describe('variacoes — variacao.create', () => {
  const v = (p) => validatePayload(create, p);

  test('válido — sku + price', () => {
    assert.deepEqual(v({ sku: 'CAM-AZ-M', price: 49.9 }), []);
  });

  test('válido — reference + price', () => {
    assert.deepEqual(v({ reference: 'REF-001', price: 49.9 }), []);
  });

  test('válido — com stock', () => {
    assert.deepEqual(v({ sku: 'X', price: 1, stock: 100 }), []);
  });

  test('válido — preço zero', () => {
    assert.deepEqual(v({ sku: 'X', price: 0 }), []);
  });

  test('inválido — falta price', () => {
    assert.equal(v({ sku: 'X' }).length, 1);
  });

  test('inválido — price negativo', () => {
    assert.equal(v({ sku: 'X', price: -1 }).length, 1);
  });

  test('inválido — price string', () => {
    assert.equal(v({ sku: 'X', price: '1' }).length, 1);
  });

  test('inválido — campo extra', () => {
    assert.equal(v({ sku: 'X', price: 1, extra: 1 }).length, 1);
  });

  test('oracle: válido', () => {
    assertOracleAgrees(create, { sku: 'X', price: 1 }, validatePayload);
  });
});

describe('variacoes — variacao.update', () => {
  const v = (p) => validatePayload(update, p);

  test('válido — só price', () => assert.deepEqual(v({ price: 49 }), []));
  test('válido — só stock', () => assert.deepEqual(v({ stock: 5 }), []));
  test('válido — vazio', () => assert.deepEqual(v({}), []));
  test('inválido — type errado', () => assert.equal(v({ price: '1' }).length, 1));
  test('inválido — extra', () => assert.equal(v({ price: 1, extra: 1 }).length, 1));
});
