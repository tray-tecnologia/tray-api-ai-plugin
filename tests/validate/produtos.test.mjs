import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePayload } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';
import create from '../../skills/produtos/schemas/produto.create.json' with { type: 'json' };
import update from '../../skills/produtos/schemas/produto.update.json' with { type: 'json' };
import * as fx from './helpers/fixtures.mjs';

describe('produtos — produto.create', () => {
  const v = (p) => validatePayload(create, p);

  test('válido — mínimos (name + price)', () => {
    assert.deepEqual(v({ name: 'Camiseta', price: 49.9 }), []);
  });

  test('válido — com stock', () => {
    assert.deepEqual(v({ name: 'C', price: 1, stock: 100 }), []);
  });

  test('válido — com EAN-13 correto', () => {
    assert.deepEqual(v({ name: 'C', price: 1, ean: fx.EANS_VALIDOS[0] }), []);
  });

  test('válido — com NCM', () => {
    assert.deepEqual(v({ name: 'C', price: 1, ncm: fx.NCMS_VALIDOS[0] }), []);
  });

  test('válido — preço zero (promo)', () => {
    assert.deepEqual(v({ name: 'C', price: 0 }), []);
  });

  test('válido — descrição opcional', () => {
    assert.deepEqual(v({ name: 'C', price: 1, description: 'Texto longo' }), []);
  });

  test('inválido — falta name', () => {
    assert.equal(v({ price: 1 }).length, 1);
  });

  test('inválido — falta price', () => {
    assert.equal(v({ name: 'C' }).length, 1);
  });

  test('inválido — price negativo', () => {
    const errs = v({ name: 'C', price: -1 });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /price.*>= 0/);
  });

  test('inválido — price string', () => {
    assert.equal(v({ name: 'C', price: '49.90' }).length, 1);
  });

  test('inválido — name excede 255 chars', () => {
    assert.equal(v({ name: 'X'.repeat(256), price: 1 }).length, 1);
  });

  test('inválido — EAN com DV errado', () => {
    const errs = v({ name: 'C', price: 1, ean: fx.EANS_INVALIDOS[0] });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /EAN/);
  });

  test('inválido — NCM com 7 dígitos', () => {
    assert.equal(v({ name: 'C', price: 1, ncm: '6109100' }).length, 1);
  });

  test('inválido — campo extra', () => {
    assert.equal(v({ name: 'C', price: 1, extra: 1 }).length, 1);
  });

  test('oracle: válido', () => {
    assertOracleAgrees(create, { name: 'C', price: 1 }, validatePayload);
  });

  test('oracle: falta required', () => {
    assertOracleAgrees(create, { price: 1 }, validatePayload);
  });
});

describe('produtos — produto.update', () => {
  const v = (p) => validatePayload(update, p);

  test('válido — atualização de price apenas (regressão de PUT)', () => {
    assert.deepEqual(v({ price: 99.9 }), []);
  });

  test('válido — atualização de stock apenas', () => {
    assert.deepEqual(v({ stock: 50 }), []);
  });

  test('válido — vazio (no-op)', () => {
    assert.deepEqual(v({}), []);
  });

  test('válido — múltiplos campos', () => {
    assert.deepEqual(v({ name: 'X', price: 1, stock: 10 }), []);
  });

  test('inválido — type errado', () => {
    assert.equal(v({ price: '99' }).length, 1);
  });

  test('inválido — price negativo', () => {
    assert.equal(v({ price: -1 }).length, 1);
  });

  test('inválido — campo extra', () => {
    assert.equal(v({ name: 'X', extra: 1 }).length, 1);
  });

  test('oracle: PUT vazio é válido', () => {
    assertOracleAgrees(update, {}, validatePayload);
  });
});
