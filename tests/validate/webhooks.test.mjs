import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePayload } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';
import payload from '../../skills/webhooks/schemas/webhook.payload.json' with { type: 'json' };

describe('webhooks — webhook.payload', () => {
  const v = (p) => validatePayload(payload, p);

  test('válido — order.insert', () => {
    assert.deepEqual(v({ seller_id: 1, scope_id: 1, scope_name: 'order', act: 'insert' }), []);
  });

  test('válido — product.update', () => {
    assert.deepEqual(v({ seller_id: 1, scope_id: 1, scope_name: 'product', act: 'update' }), []);
  });

  test('válido — customer.delete', () => {
    assert.deepEqual(v({ seller_id: 1, scope_id: 1, scope_name: 'customer', act: 'delete' }), []);
  });

  test('válido — variant.insert', () => {
    assert.deepEqual(v({ seller_id: 1, scope_id: 1, scope_name: 'variant', act: 'insert' }), []);
  });

  test('válido — order_status.update', () => {
    assert.deepEqual(v({ seller_id: 1, scope_id: 1, scope_name: 'order_status', act: 'update' }), []);
  });

  test('inválido — falta seller_id', () => {
    assert.equal(v({ scope_id: 1, scope_name: 'order', act: 'insert' }).length, 1);
  });

  test('inválido — falta act', () => {
    const errs = v({ seller_id: 1, scope_id: 1, scope_name: 'order' });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /act.*obrigatório/);
  });

  test('inválido — scope_name fora do enum', () => {
    assert.equal(v({ seller_id: 1, scope_id: 1, scope_name: 'foo', act: 'insert' }).length, 1);
  });

  test('inválido — act fora do enum', () => {
    assert.equal(v({ seller_id: 1, scope_id: 1, scope_name: 'order', act: 'foo' }).length, 1);
  });

  test('inválido — campo extra', () => {
    assert.equal(v({ seller_id: 1, scope_id: 1, scope_name: 'order', act: 'insert', extra: 1 }).length, 1);
  });

  test('oracle: válido', () => {
    assertOracleAgrees(payload, { seller_id: 1, scope_id: 1, scope_name: 'order', act: 'insert' }, validatePayload);
  });
});
