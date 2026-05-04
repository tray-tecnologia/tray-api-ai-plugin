import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePayload } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';
import authRequest from '../../skills/autorizacao/schemas/auth-request.json' with { type: 'json' };
import authRefresh from '../../skills/autorizacao/schemas/auth-refresh.json' with { type: 'json' };

describe('autorizacao — auth-request', () => {
  const v = (p) => validatePayload(authRequest, p);

  test('válido — 3 campos', () => {
    assert.deepEqual(v({ consumer_key: 'k', consumer_secret: 's', code: 'c' }), []);
  });

  test('válido — código longo', () => {
    assert.deepEqual(v({ consumer_key: 'k', consumer_secret: 's', code: 'a'.repeat(64) }), []);
  });

  test('inválido — falta consumer_key', () => {
    const errs = v({ consumer_secret: 's', code: 'c' });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /consumer_key.*obrigatório/);
  });

  test('inválido — falta consumer_secret', () => {
    const errs = v({ consumer_key: 'k', code: 'c' });
    assert.equal(errs.length, 1);
  });

  test('inválido — falta code', () => {
    const errs = v({ consumer_key: 'k', consumer_secret: 's' });
    assert.equal(errs.length, 1);
  });

  test('inválido — type errado', () => {
    const errs = v({ consumer_key: 1, consumer_secret: 's', code: 'c' });
    assert.equal(errs.length, 1);
  });

  test('inválido — campo extra', () => {
    const errs = v({ consumer_key: 'k', consumer_secret: 's', code: 'c', extra: true });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /extra/);
  });

  test('inválido — todos faltando', () => {
    assert.equal(v({}).length, 3);
  });

  test('oracle: válido', () => {
    assertOracleAgrees(authRequest, { consumer_key: 'k', consumer_secret: 's', code: 'c' }, validatePayload);
  });

  test('oracle: inválido', () => {
    assertOracleAgrees(authRequest, {}, validatePayload);
  });
});

describe('autorizacao — auth-refresh', () => {
  const v = (p) => validatePayload(authRefresh, p);

  test('válido — 2 campos', () => {
    assert.deepEqual(v({ consumer_key: 'k', refresh_token: 'rt' }), []);
  });

  test('válido — refresh_token longo', () => {
    assert.deepEqual(v({ consumer_key: 'k', refresh_token: 'a'.repeat(128) }), []);
  });

  test('inválido — falta consumer_key', () => {
    assert.equal(v({ refresh_token: 'rt' }).length, 1);
  });

  test('inválido — falta refresh_token', () => {
    assert.equal(v({ consumer_key: 'k' }).length, 1);
  });

  test('inválido — type errado', () => {
    assert.equal(v({ consumer_key: 'k', refresh_token: 123 }).length, 1);
  });

  test('inválido — campo extra', () => {
    assert.equal(v({ consumer_key: 'k', refresh_token: 'rt', code: 'c' }).length, 1);
  });

  test('oracle: válido', () => {
    assertOracleAgrees(authRefresh, { consumer_key: 'k', refresh_token: 'rt' }, validatePayload);
  });

  test('oracle: inválido', () => {
    assertOracleAgrees(authRefresh, {}, validatePayload);
  });
});
