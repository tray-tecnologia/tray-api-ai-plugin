import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePayload } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';
import create from '../../skills/pedidos/schemas/pedido.create.json' with { type: 'json' };
import update from '../../skills/pedidos/schemas/pedido.update.json' with { type: 'json' };

describe('pedidos — pedido.create', () => {
  const v = (p) => validatePayload(create, p);

  test('válido — mínimo (customer_id + products array)', () => {
    assert.deepEqual(v({ customer_id: 42, products: [{ product_id: 1, quantity: 1 }] }), []);
  });

  test('válido — com shipping_date YYYY-MM-DD', () => {
    assert.deepEqual(
      v({ customer_id: 42, products: [{ product_id: 1, quantity: 1 }], shipping_date: '2026-04-15' }),
      [],
    );
  });

  test('válido — com payment_method', () => {
    assert.deepEqual(
      v({ customer_id: 1, products: [{ product_id: 1, quantity: 1 }], payment_method: 'pix' }),
      [],
    );
  });

  test('válido — múltiplos produtos', () => {
    assert.deepEqual(
      v({
        customer_id: 1,
        products: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 },
        ],
      }),
      [],
    );
  });

  test('inválido — falta customer_id', () => {
    assert.equal(v({ products: [{ product_id: 1, quantity: 1 }] }).length, 1);
  });

  test('inválido — falta products', () => {
    assert.equal(v({ customer_id: 1 }).length, 1);
  });

  test('inválido — products não-array', () => {
    assert.equal(v({ customer_id: 1, products: 'foo' }).length, 1);
  });

  test('inválido — shipping_date em DD/MM/YYYY', () => {
    const errs = v({ customer_id: 1, products: [{ product_id: 1, quantity: 1 }], shipping_date: '15/04/2026' });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /Data inválida|YYYY-MM-DD/);
  });

  test('inválido — campo extra', () => {
    assert.equal(
      v({ customer_id: 1, products: [{ product_id: 1, quantity: 1 }], extra: true }).length,
      1,
    );
  });

  test('oracle: válido', () => {
    assertOracleAgrees(create, { customer_id: 1, products: [{ product_id: 1, quantity: 1 }] }, validatePayload);
  });
});

describe('pedidos — pedido.update', () => {
  const v = (p) => validatePayload(update, p);

  test('válido — só status_id', () => {
    assert.deepEqual(v({ status_id: 5 }), []);
  });

  test('válido — só tracking_code', () => {
    assert.deepEqual(v({ tracking_code: 'BR123456789' }), []);
  });

  test('válido — vazio', () => {
    assert.deepEqual(v({}), []);
  });

  test('inválido — status_id string', () => {
    assert.equal(v({ status_id: '5' }).length, 1);
  });

  test('inválido — campo extra', () => {
    assert.equal(v({ status_id: 5, extra: 1 }).length, 1);
  });

  test('oracle: vazio é válido', () => {
    assertOracleAgrees(update, {}, validatePayload);
  });
});
