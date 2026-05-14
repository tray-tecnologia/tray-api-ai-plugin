import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePayload, matchesType } from '../../scripts/lib/validate-schema.mjs';
import { assertOracleAgrees } from './helpers/ajv-oracle.mjs';
import * as fx from './helpers/fixtures.mjs';

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

describe('validatePayload — format', () => {
  const cpfSchema = {
    title: 'Customer',
    type: 'object',
    properties: { cpf: { type: 'string', format: 'cpf' } },
    additionalProperties: false,
  };

  test('format cpf — válido', () => {
    for (const cpf of fx.CPFS_VALIDOS) {
      assert.deepEqual(validatePayload(cpfSchema, { cpf }), [], `falhou em ${cpf}`);
    }
  });

  test('format cpf — inválido', () => {
    for (const cpf of fx.CPFS_INVALIDOS) {
      const errs = validatePayload(cpfSchema, { cpf });
      assert.equal(errs.length, 1, `${cpf} deveria falhar`);
      assert.equal(errs[0].keyword, 'format');
      assert.match(errs[0].message, /CPF inválido/);
    }
  });

  test('format ean — DV correto/incorreto', () => {
    const schema = {
      title: 'Product',
      type: 'object',
      properties: { ean: { type: 'string', format: 'ean' } },
      additionalProperties: false,
    };
    for (const ean of fx.EANS_VALIDOS) {
      assert.deepEqual(validatePayload(schema, { ean }), [], `falhou em ${ean}`);
    }
    for (const ean of fx.EANS_INVALIDOS) {
      assert.equal(validatePayload(schema, { ean }).length, 1, `${ean} deveria falhar`);
    }
  });

  test('format desconhecido — passa (avisado pelo lint-schemas)', () => {
    const schema = {
      type: 'object',
      properties: { x: { type: 'string', format: 'fakeFormat' } },
    };
    // sem erro: format desconhecido em runtime é silencioso (lint pega)
    assert.deepEqual(validatePayload(schema, { x: 'qq coisa' }), []);
  });
});

describe('validatePayload — pattern', () => {
  const slugSchema = {
    title: 'Brand',
    type: 'object',
    properties: { slug: { type: 'string', pattern: '^[a-z0-9-]+$' } },
    additionalProperties: false,
  };

  test('pattern — válido', () => {
    assert.deepEqual(validatePayload(slugSchema, { slug: 'nike-air' }), []);
  });

  test('pattern — inválido', () => {
    const errs = validatePayload(slugSchema, { slug: 'Nike Air' });
    assert.equal(errs.length, 1);
    assert.equal(errs[0].keyword, 'pattern');
    assert.match(errs[0].message, /pattern/);
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

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

function makeFakeSkill(skillName, schemas) {
  const dir = join(tmpdir(), `tray-validate-test-${Date.now()}-${skillName}`);
  mkdirSync(join(dir, 'schemas'), { recursive: true });
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  for (const [name, schema] of Object.entries(schemas)) {
    writeFileSync(join(dir, 'schemas', `${name}.json`), JSON.stringify(schema));
  }
  // CLI fino que chama runValidator com `__dir` apontando para esta skill fake
  const cli = `
import { runValidator } from '${join(ROOT, 'scripts/lib/validate-schema.mjs').replace(/\\/g, '/')}';
await runValidator({
  callerUrl: import.meta.url,
  skillName: '${skillName}',
  usageExample: '{}',
});
`;
  writeFileSync(join(dir, 'scripts', 'validate.mjs'), cli);
  return { dir, cli: join(dir, 'scripts', 'validate.mjs') };
}

function run(cli, args, { input } = {}) {
  return spawnSync('node', [cli, ...args], { input, encoding: 'utf-8' });
}

describe('runValidator — CLI', () => {
  const minimal = {
    title: 'Test',
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
    additionalProperties: false,
  };

  test('exit 0 — payload válido', () => {
    const { cli, dir } = makeFakeSkill('foo', { 'foo.create': minimal });
    const r = run(cli, ['--schema=foo.create', '{"Test":{"name":"X"}}']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Payload válido/);
    rmSync(dir, { recursive: true });
  });

  test('exit 1 — payload inválido (humano)', () => {
    const { cli, dir } = makeFakeSkill('foo', { 'foo.create': minimal });
    const r = run(cli, ['--schema=foo.create', '{"Test":{}}']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /name.*obrigatório/);
    rmSync(dir, { recursive: true });
  });

  test('exit 1 — payload inválido (--json)', () => {
    const { cli, dir } = makeFakeSkill('foo', { 'foo.create': minimal });
    const r = run(cli, ['--json', '--schema=foo.create', '{"Test":{}}']);
    assert.equal(r.status, 1);
    const out = JSON.parse(r.stdout);
    assert.equal(out.valid, false);
    assert.equal(out.errors.length, 1);
    assert.equal(out.errors[0].keyword, 'required');
    assert.equal(out.schema, 'foo.create');
    assert.equal(out.validatorVersion, '2.0.0');
    rmSync(dir, { recursive: true });
  });

  test('exit 0 — payload válido com --json', () => {
    const { cli, dir } = makeFakeSkill('foo', { 'foo.create': minimal });
    const r = run(cli, ['--json', '--schema=foo.create', '{"Test":{"name":"X"}}']);
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.valid, true);
    assert.equal(out.schema, 'foo.create');
    rmSync(dir, { recursive: true });
  });

  test('exit 2 — múltiplos schemas sem --schema', () => {
    const { cli, dir } = makeFakeSkill('foo', {
      'foo.create': minimal,
      'foo.update': minimal,
    });
    const r = run(cli, ['{"Test":{"name":"X"}}']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /múltiplos schemas/);
    assert.match(r.stderr, /foo\.create.*foo\.update/);
    rmSync(dir, { recursive: true });
  });

  test('exit 2 — schema inexistente', () => {
    const { cli, dir } = makeFakeSkill('foo', { 'foo.create': minimal });
    const r = run(cli, ['--schema=foo.update', '{"Test":{"name":"X"}}']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /não existe/);
    rmSync(dir, { recursive: true });
  });

  test('exit 2 — JSON malformado', () => {
    const { cli, dir } = makeFakeSkill('foo', { 'foo.create': minimal });
    const r = run(cli, ['--schema=foo.create', '{name: "X"}']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /JSON válido/);
    rmSync(dir, { recursive: true });
  });

  test('exit 0 — --list-schemas', () => {
    const { cli, dir } = makeFakeSkill('foo', {
      'foo.create': minimal,
      'foo.update': minimal,
    });
    const r = run(cli, ['--list-schemas']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /foo\.create/);
    assert.match(r.stdout, /foo\.update/);
    rmSync(dir, { recursive: true });
  });

  test('stdin — payload via pipe', () => {
    const { cli, dir } = makeFakeSkill('foo', { 'foo.create': minimal });
    const r = run(cli, ['--schema=foo.create'], { input: '{"Test":{"name":"X"}}' });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Payload válido/);
    rmSync(dir, { recursive: true });
  });

  test('skill com 1 schema — sem flag funciona', () => {
    const { cli, dir } = makeFakeSkill('foo', { 'foo.payload': minimal });
    const r = run(cli, ['{"Test":{"name":"X"}}']);
    assert.equal(r.status, 0);
    rmSync(dir, { recursive: true });
  });
});
