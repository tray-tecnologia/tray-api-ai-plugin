import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePayload } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';
import create from '../../skills/marcas/schemas/marca.create.json' with { type: 'json' };
import update from '../../skills/marcas/schemas/marca.update.json' with { type: 'json' };

describe('marcas — marca.create', () => {
  const v = (p) => validatePayload(create, p);

  test('válido — só name', () => assert.deepEqual(v({ name: 'Nike' }), []));
  test('válido — com slug válido', () => assert.deepEqual(v({ name: 'Nike', slug: 'nike-air' }), []));
  test('válido — com slug numérico', () => assert.deepEqual(v({ name: 'X', slug: '123-abc' }), []));
  test('válido — com active', () => assert.deepEqual(v({ name: 'X', active: 1 }), []));
  test('inválido — falta name', () => assert.equal(v({}).length, 1));
  test('inválido — slug com espaço', () => {
    const errs = v({ name: 'X', slug: 'nike air' });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /pattern/);
  });
  test('inválido — slug com maiúscula', () => {
    assert.equal(v({ name: 'X', slug: 'Nike' }).length, 1);
  });
  test('inválido — extra', () => assert.equal(v({ name: 'X', extra: 1 }).length, 1));
  test('oracle: slug válido', () => {
    assertOracleAgrees(create, { name: 'X', slug: 'a-b-c' }, validatePayload);
  });
  test('oracle: slug inválido', () => {
    assertOracleAgrees(create, { name: 'X', slug: 'A B C' }, validatePayload);
  });
});

describe('marcas — marca.update', () => {
  const v = (p) => validatePayload(update, p);

  test('válido — só slug', () => assert.deepEqual(v({ slug: 'novo-slug' }), []));
  test('válido — vazio', () => assert.deepEqual(v({}), []));
  test('inválido — slug com espaço', () => assert.equal(v({ slug: 'a b' }).length, 1));
  test('inválido — extra', () => assert.equal(v({ name: 'X', extra: 1 }).length, 1));
});
