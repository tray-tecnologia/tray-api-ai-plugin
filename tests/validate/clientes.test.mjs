import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePayload } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';
import create from '../../skills/clientes/schemas/cliente.create.json' with { type: 'json' };
import update from '../../skills/clientes/schemas/cliente.update.json' with { type: 'json' };
import * as fx from './helpers/fixtures.mjs';

describe('clientes — cliente.create', () => {
  const v = (p) => validatePayload(create, p);

  test('válido — name + email', () => {
    assert.deepEqual(v({ name: 'Ana', email: 'ana@x.com' }), []);
  });

  test('válido — com CPF correto', () => {
    assert.deepEqual(v({ name: 'Ana', email: 'ana@x.com', cpf: fx.CPFS_VALIDOS[0] }), []);
  });

  test('válido — com CNPJ correto', () => {
    assert.deepEqual(v({ name: 'ACME', email: 'a@b.com', cnpj: fx.CNPJS_VALIDOS[0] }), []);
  });

  test('válido — email com subdomínio', () => {
    assert.deepEqual(v({ name: 'Ana', email: 'ana@sub.dom.com.br' }), []);
  });

  test('válido — com gender', () => {
    assert.deepEqual(v({ name: 'Ana', email: 'a@b.com', gender: 'F' }), []);
  });

  test('inválido — falta name', () => {
    assert.equal(v({ email: 'a@b.com' }).length, 1);
  });

  test('inválido — falta email', () => {
    assert.equal(v({ name: 'A' }).length, 1);
  });

  test('inválido — email malformado', () => {
    const errs = v({ name: 'A', email: 'sem-arroba' });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /Email inválido/);
  });

  test('inválido — CPF "111"', () => {
    const errs = v({ name: 'A', email: 'a@b.com', cpf: '111' });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /CPF inválido/);
  });

  test('inválido — CPF todos zeros', () => {
    assert.equal(v({ name: 'A', email: 'a@b.com', cpf: '00000000000' }).length, 1);
  });

  test('inválido — CNPJ DV errado', () => {
    assert.equal(v({ name: 'A', email: 'a@b.com', cnpj: fx.CNPJS_INVALIDOS[3] }).length, 1);
  });

  test('inválido — gender fora do enum', () => {
    assert.equal(v({ name: 'A', email: 'a@b.com', gender: 'X' }).length, 1);
  });

  test('inválido — campo extra', () => {
    assert.equal(v({ name: 'A', email: 'a@b.com', extra: 1 }).length, 1);
  });

  test('oracle: válido', () => {
    assertOracleAgrees(create, { name: 'A', email: 'a@b.com' }, validatePayload);
  });

  test('oracle: falta required', () => {
    assertOracleAgrees(create, {}, validatePayload);
  });
});

describe('clientes — cliente.update', () => {
  const v = (p) => validatePayload(update, p);

  test('válido — só email', () => {
    assert.deepEqual(v({ email: 'novo@x.com' }), []);
  });

  test('válido — vazio', () => {
    assert.deepEqual(v({}), []);
  });

  test('válido — atualização de cpf válido', () => {
    assert.deepEqual(v({ cpf: fx.CPFS_VALIDOS[1] }), []);
  });

  test('inválido — email malformado', () => {
    assert.equal(v({ email: 'sem-arroba' }).length, 1);
  });

  test('inválido — cpf inválido', () => {
    assert.equal(v({ cpf: '111' }).length, 1);
  });

  test('inválido — campo extra', () => {
    assert.equal(v({ name: 'X', extra: 1 }).length, 1);
  });
});
