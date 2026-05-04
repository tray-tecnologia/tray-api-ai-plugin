import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { splitMarkdown } from '../../scripts/lib/markdown-splitter.mjs';
import { SAMPLE_MD, EXPECTED_SECTIONS_COUNT } from './helpers/fixtures.mjs';

test('splitter: produz array de seções', () => {
  const sections = splitMarkdown(SAMPLE_MD);
  assert.ok(Array.isArray(sections));
  assert.equal(sections.length, EXPECTED_SECTIONS_COUNT);
});

test('splitter: cada seção tem campos esperados', () => {
  const sections = splitMarkdown(SAMPLE_MD);
  for (const s of sections) {
    assert.ok('h1' in s);
    assert.ok('title' in s);
    assert.ok('level' in s);
    assert.ok('body' in s);
    assert.ok('anchor' in s);
    assert.ok('code' in s);
    assert.ok(['h1', 'h2', 'h3'].includes(s.level));
  }
});

test('splitter: H1 propaga para filhos', () => {
  const sections = splitMarkdown(SAMPLE_MD);
  const fluxo = sections.find(s => s.title === 'Fluxo de autorização');
  assert.ok(fluxo);
  assert.equal(fluxo.h1, 'Como Integrar');
  assert.equal(fluxo.level, 'h3');
});

test('splitter: extrai blocos de código', () => {
  const sections = splitMarkdown(SAMPLE_MD);
  const gerar = sections.find(s => s.title === 'Gerar Chaves de Acesso');
  assert.ok(gerar);
  assert.equal(gerar.code.length, 2);
  assert.equal(gerar.code[0].lang, 'shell');
  assert.ok(gerar.code[0].content.includes('curl'));
  assert.equal(gerar.code[1].lang, 'php');
});

test('splitter: anchor é slug do título', () => {
  const sections = splitMarkdown(SAMPLE_MD);
  const auth = sections.find(s => s.title === 'Autorizando seu Aplicativo');
  assert.ok(auth);
  assert.equal(auth.anchor, 'autorizando-seu-aplicativo');
});

test('splitter: body não inclui código', () => {
  const sections = splitMarkdown(SAMPLE_MD);
  const gerar = sections.find(s => s.title === 'Gerar Chaves de Acesso');
  assert.ok(!gerar.body.includes('curl'));
  assert.ok(!gerar.body.includes('<?php'));
});

test('splitter: body é texto limpo (sem ``` markers)', () => {
  const sections = splitMarkdown(SAMPLE_MD);
  const fence = '```';
  for (const s of sections) {
    assert.ok(!s.body.includes(fence), `body de "${s.title}" tem markers`);
  }
});

test('splitter: H1 isolado vira seção', () => {
  const sections = splitMarkdown(SAMPLE_MD);
  const integrar = sections.find(s => s.title === 'Como Integrar' && s.level === 'h1');
  assert.ok(integrar);
});

test('splitter: input vazio retorna []', () => {
  assert.deepEqual(splitMarkdown(''), []);
  assert.deepEqual(splitMarkdown('   \n  '), []);
});

test('splitter: input sem headings retorna []', () => {
  assert.deepEqual(splitMarkdown('só texto solto sem titulo'), []);
});
