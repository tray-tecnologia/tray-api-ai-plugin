import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findAllSchemas } from '../../mcp/lib/load-schemas.mjs';
import { validateToolDefinition, handleValidate } from '../../mcp/tools/validate.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..', '..');

let schemaMap;
before(() => {
  schemaMap = findAllSchemas(ROOT);
});

describe('validateToolDefinition', () => {
  test('metadata covers MCP shape', () => {
    assert.equal(validateToolDefinition.name, 'tray.validate');
    assert.ok(typeof validateToolDefinition.description === 'string');
    assert.ok(validateToolDefinition.description.length > 0);
    assert.deepEqual(validateToolDefinition.inputSchema.required.sort(), ['payload', 'schema']);
  });
});

describe('handleValidate', () => {
  test('valid produto.create envelope returns valid true', async () => {
    const res = await handleValidate(
      {
        schema: 'produto.create',
        payload: { Product: { name: 'Camisa', price: 99 } },
      },
      schemaMap,
    );
    assert.notEqual(res.isError, true);
    assert.ok(Array.isArray(res.content));
    assert.equal(res.content[0].type, 'text');
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.valid, true);
    assert.equal(body.schema, 'produto.create');
    assert.ok(Array.isArray(body.errors));
    assert.equal(body.errors.length, 0);
  });

  test('missing Product wrapper yields required errors', async () => {
    const res = await handleValidate({ schema: 'produto.create', payload: {} }, schemaMap);
    assert.ok(!res.isError);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.valid, false);
    assert.ok(body.errors.length >= 1);
    assert.ok(body.errors.some((e) => e.keyword === 'required'));
  });

  test('unknown schema returns SCHEMA_NOT_FOUND', async () => {
    const res = await handleValidate({ schema: 'produto.inexistente', payload: {} }, schemaMap);
    assert.equal(res.isError, true);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.error, 'SCHEMA_NOT_FOUND');
    assert.equal(body.schema, 'produto.inexistente');
    assert.ok(Array.isArray(body.available));
    assert.ok(body.available.length >= 15);
    assert.ok(body.available.includes('produto.create'));
  });

  test('missing payload returns INVALID_INPUT', async () => {
    const res = await handleValidate({ schema: 'produto.create' }, schemaMap);
    assert.equal(res.isError, true);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.error, 'INVALID_INPUT');
    assert.ok(typeof body.message === 'string');
    assert.ok(Array.isArray(body.issues));
  });

  test('missing schema returns INVALID_INPUT', async () => {
    const res = await handleValidate({ payload: {} }, schemaMap);
    assert.equal(res.isError, true);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.error, 'INVALID_INPUT');
  });

  test('response text parses as JSON', async () => {
    const res = await handleValidate(
      { schema: 'produto.create', payload: { Product: { name: 'X', price: 1 } } },
      schemaMap,
    );
    assert.doesNotThrow(() => JSON.parse(res.content[0].text));
  });

  test('invalid EAN triggers format keyword', async () => {
    const res = await handleValidate(
      {
        schema: 'produto.create',
        payload: { Product: { name: 'Item', price: 10, ean: '123' } },
      },
      schemaMap,
    );
    assert.ok(!res.isError);
    const body = JSON.parse(res.content[0].text);
    assert.equal(body.valid, false);
    assert.ok(body.errors.some((e) => e.keyword === 'format'));
  });
});
