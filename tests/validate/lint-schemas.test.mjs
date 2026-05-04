import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { lintSchema, ALLOWED_KEYWORDS, ALLOWED_FORMATS } from '../../scripts/lint-schemas.mjs';

describe('lintSchema', () => {
  test('aceita schema mínimo válido', () => {
    const errs = lintSchema({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Foo',
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    });
    assert.deepEqual(errs, []);
  });

  test('aceita format conhecido', () => {
    const errs = lintSchema({
      type: 'object',
      properties: { cpf: { type: 'string', format: 'cpf' } },
    });
    assert.deepEqual(errs, []);
  });

  test('rejeita oneOf', () => {
    const errs = lintSchema({
      type: 'object',
      properties: {
        x: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
      },
    });
    assert.equal(errs.length, 1);
    assert.match(errs[0], /oneOf/);
  });

  test('rejeita $ref', () => {
    const errs = lintSchema({
      type: 'object',
      properties: { x: { $ref: '#/definitions/foo' } },
    });
    assert.equal(errs.length, 1);
    assert.match(errs[0], /\$ref/);
  });

  test('rejeita format desconhecido', () => {
    const errs = lintSchema({
      type: 'object',
      properties: { x: { type: 'string', format: 'hostname' } },
    });
    assert.equal(errs.length, 1);
    assert.match(errs[0], /format.*hostname/);
  });

  test('rejeita additionalProperties não-false', () => {
    const errs = lintSchema({
      type: 'object',
      additionalProperties: { type: 'string' },
    });
    assert.equal(errs.length, 1);
    assert.match(errs[0], /additionalProperties/);
  });

  test('múltiplos erros agregados', () => {
    const errs = lintSchema({
      type: 'object',
      properties: {
        a: { oneOf: [{ type: 'string' }] },
        b: { $ref: '#/foo' },
      },
    });
    assert.equal(errs.length, 2);
  });

  test('expõe ALLOWED_KEYWORDS e ALLOWED_FORMATS', () => {
    assert.ok(ALLOWED_KEYWORDS.includes('required'));
    assert.ok(ALLOWED_KEYWORDS.includes('format'));
    assert.ok(ALLOWED_FORMATS.includes('cpf'));
    assert.ok(ALLOWED_FORMATS.includes('email'));
  });

  test('aceita pattern', () => {
    const errs = lintSchema({
      type: 'object',
      properties: { slug: { type: 'string', pattern: '^[a-z]+$' } },
    });
    assert.deepEqual(errs, []);
  });

  test('rejeita allOf', () => {
    const errs = lintSchema({
      type: 'object',
      allOf: [{ properties: {} }],
    });
    assert.equal(errs.length, 1);
    assert.match(errs[0], /allOf/);
  });
});
