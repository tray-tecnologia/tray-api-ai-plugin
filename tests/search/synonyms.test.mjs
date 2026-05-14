import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYN_PATH = join(__dirname, '..', '..', 'skills', 'tray-dev', 'assets', 'synonyms-pt-br.json');

const data = JSON.parse(await readFile(SYN_PATH, 'utf8'));

test('synonyms file: tem version e groups', () => {
  assert.equal(data.version, '1.0.0');
  assert.ok(Array.isArray(data.groups));
});

test('synonyms file: tem >= 20 grupos', () => {
  assert.ok(data.groups.length >= 20, `esperado >=20, tem ${data.groups.length}`);
});

test('synonyms file: cada grupo tem primary e synonyms', () => {
  for (const g of data.groups) {
    assert.ok(typeof g.primary === 'string' && g.primary.length > 0);
    assert.ok(Array.isArray(g.synonyms) && g.synonyms.length > 0);
  }
});

test('synonyms file: primarys são únicos', () => {
  const seen = new Set();
  for (const g of data.groups) {
    assert.ok(!seen.has(g.primary), `primary duplicado: ${g.primary}`);
    seen.add(g.primary);
  }
});

test('synonyms file: cobre verbos HTTP CRUD', () => {
  const primarys = data.groups.map(g => g.primary);
  for (const verb of ['get','post','put','delete']) {
    assert.ok(primarys.includes(verb), `falta verbo HTTP: ${verb}`);
  }
});

test('synonyms file: cobre recursos principais', () => {
  const primarys = data.groups.map(g => g.primary);
  for (const r of ['product','customer','order','webhook']) {
    assert.ok(primarys.includes(r), `falta recurso: ${r}`);
  }
});
