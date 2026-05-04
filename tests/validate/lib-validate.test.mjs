import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePayload, matchesType } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';

const baseSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Test',
  type: 'object',
  properties: {
    name: { type: 'string', maxLength: 10 },
    age: { type: 'integer', minimum: 0 },
    role: { type: 'string', enum: ['admin', 'user', 'guest'] },
  },
  required: ['name'],
  additionalProperties: false,
};

describe('validatePayload — features básicas', () => {
  test('válido — só campo obrigatório', () => {
    assert.deepEqual(validatePayload(baseSchema, { name: 'Ana' }), []);
  });

  test('válido — todos os campos preenchidos', () => {
    assert.deepEqual(
      validatePayload(baseSchema, { name: 'Bob', age: 30, role: 'admin' }),
      [],
    );
  });

  test('inválido — falta required', () => {
    const errs = validatePayload(baseSchema, { age: 30 });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /name.*obrigatório/);
  });

  test('inválido — type errado', () => {
    const errs = validatePayload(baseSchema, { name: 'X', age: '30' });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /age.*tipo integer/);
  });

  test('inválido — maxLength excedido', () => {
    const errs = validatePayload(baseSchema, { name: 'X'.repeat(11) });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /name.*excede 10/);
  });

  test('inválido — minimum violado', () => {
    const errs = validatePayload(baseSchema, { name: 'X', age: -1 });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /age.*>= 0/);
  });

  test('inválido — enum não aceito', () => {
    const errs = validatePayload(baseSchema, { name: 'X', role: 'root' });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /role.*inválido/);
  });

  test('inválido — additionalProperties: false rejeita extra', () => {
    const errs = validatePayload(baseSchema, { name: 'X', extra: 1 });
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /extra.*não é um campo/);
  });

  test('múltiplos erros simultâneos', () => {
    const errs = validatePayload(baseSchema, { age: '30', role: 'root' });
    assert.equal(errs.length, 3); // falta name + type age + enum role
  });

  test('oracle: AJV concorda — válido', () => {
    assertOracleAgrees(baseSchema, { name: 'Ana' }, validatePayload);
  });

  test('oracle: AJV concorda — falta required', () => {
    assertOracleAgrees(baseSchema, { age: 30 }, validatePayload);
  });

  test('oracle: AJV concorda — type errado', () => {
    assertOracleAgrees(baseSchema, { name: 'X', age: '30' }, validatePayload);
  });

  test('oracle: AJV concorda — extra rejeitado', () => {
    assertOracleAgrees(baseSchema, { name: 'X', extra: 1 }, validatePayload);
  });
});

describe('matchesType', () => {
  test('string', () => assert.equal(matchesType('x', 'string'), true));
  test('number aceita inteiro', () => assert.equal(matchesType(1, 'number'), true));
  test('integer rejeita decimal', () => assert.equal(matchesType(1.5, 'integer'), false));
  test('array', () => assert.equal(matchesType([], 'array'), true));
  test('object não-array', () => assert.equal(matchesType({}, 'object'), true));
  test('object rejeita array', () => assert.equal(matchesType([], 'object'), false));
  test('null', () => assert.equal(matchesType(null, 'null'), true));
  test('union string|null', () => assert.equal(matchesType(null, ['string', 'null']), true));
});
