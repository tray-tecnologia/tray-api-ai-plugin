import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { stem, stemTokens } from '../../scripts/lib/stemmer-pt-br.mjs';

test('stemmer: remove sufixo -mente', () => {
  assert.equal(stem('rapidamente'), 'rapid');
  assert.equal(stem('totalmente'), 'total');
});

test('stemmer: remove sufixo -ção', () => {
  assert.equal(stem('autenticação'), 'autentic');
  assert.equal(stem('integração'), 'integr');
});

test('stemmer: remove sufixo -ões', () => {
  assert.equal(stem('autenticações'), 'autentic');
  assert.equal(stem('configurações'), 'configur');
});

test('stemmer: remove infinitivos -ar/-er/-ir', () => {
  assert.equal(stem('autenticar'), 'autentic');
  assert.equal(stem('vender'), 'vend');
  assert.equal(stem('inscrever'), 'inscrev');
  assert.equal(stem('inscrir'), 'inscr');
});

test('stemmer: remove particípio -ado/-ido', () => {
  assert.equal(stem('autenticado'), 'autentic');
  assert.equal(stem('vendido'), 'vend');
});

test('stemmer: remove plural -s simples', () => {
  assert.equal(stem('produtos'), 'produt');
  assert.equal(stem('clientes'), 'client');
});

test('stemmer: lower case', () => {
  assert.equal(stem('PRODUTO'), 'produt');
  assert.equal(stem('Produto'), 'produt');
});

test('stemmer: respeita tamanho mínimo (3)', () => {
  assert.equal(stem('os'), 'os');
  assert.equal(stem('em'), 'em');
});

test('stemmer: idempotente', () => {
  assert.equal(stem(stem('autenticação')), stem('autenticação'));
});

test('stemTokens: aplica stem em array', () => {
  assert.deepEqual(
    stemTokens(['autenticar', 'produtos', 'rapidamente']),
    ['autentic', 'produt', 'rapid']
  );
});
