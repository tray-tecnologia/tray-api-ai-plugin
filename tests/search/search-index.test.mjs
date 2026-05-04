import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  tokenize,
  buildIndex,
  search,
  expandSynonyms
} from '../../scripts/lib/search-index.mjs';

const SAMPLE_DOCS = [
  { h1: 'Autorização', title: 'Gerar Chaves', level: 'h2', body: 'Use OAuth 2.0 para autenticar', code: [{ lang: 'shell', content: 'curl -X POST /auth' }], anchor: 'gerar-chaves' },
  { h1: 'API de Produtos', title: 'POST /products', level: 'h2', body: 'Cria produto com nome preço estoque', code: [], anchor: 'post-products' },
  { h1: 'API de Produtos', title: 'PUT /products/:id', level: 'h2', body: 'Atualiza produto existente', code: [], anchor: 'put-products' },
  { h1: 'API de Clientes', title: 'POST /customers', level: 'h2', body: 'Cria cliente novo com cpf email', code: [], anchor: 'post-customers' }
];

const SYNONYMS = {
  version: '1.0.0',
  groups: [
    { primary: 'oauth', synonyms: ['autenticar','autenticacao','token'] },
    { primary: 'product', synonyms: ['produto','produtos'] },
    { primary: 'customer', synonyms: ['cliente','clientes'] },
    { primary: 'post', synonyms: ['criar','cadastrar'] }
  ]
};

test('tokenize: lowercase + remove acentos + split em palavras', () => {
  const t = tokenize('Autenticação OAuth 2.0!');
  assert.deepEqual(t, ['autentic', 'oauth', '2', '0']);
});

test('tokenize: aplica stem', () => {
  const t = tokenize('produtos clientes');
  assert.deepEqual(t, ['produt', 'client']);
});

test('tokenize: remove stopwords PT-BR', () => {
  const t = tokenize('o produto e a categoria');
  assert.ok(!t.includes('o'));
  assert.ok(!t.includes('e'));
  assert.ok(!t.includes('a'));
  assert.ok(t.includes('produt'));
  assert.ok(t.includes('categor'));
});

test('expandSynonyms: query "autenticar" expande para grupo oauth', () => {
  const expanded = expandSynonyms(['autentic'], SYNONYMS);
  assert.ok(expanded.includes('oauth'));
  assert.ok(expanded.includes('token'));
});

test('expandSynonyms: query "criar" expande para grupo post', () => {
  const expanded = expandSynonyms(['cri'], SYNONYMS);
  assert.ok(expanded.includes('post'));
  assert.ok(expanded.includes('cadastr'));
});

test('expandSynonyms: termos sem sinônimo voltam só com eles', () => {
  const expanded = expandSynonyms(['xyz123'], SYNONYMS);
  assert.deepEqual(expanded, ['xyz123']);
});

test('buildIndex: produz estrutura esperada', () => {
  const idx = buildIndex(SAMPLE_DOCS);
  assert.equal(idx.documents.length, 4);
  assert.ok(idx.avgdl > 0);
  assert.ok(idx.docFreq);
  assert.equal(idx.version, '1.0.0');
});

test('search: query "OAuth" prioriza doc de Autorização', () => {
  const idx = buildIndex(SAMPLE_DOCS);
  const r = search(idx, 'OAuth', { synonyms: SYNONYMS, limit: 3 });
  assert.ok(r.results.length >= 1);
  assert.equal(r.results[0].title, 'Gerar Chaves');
});

test('search: query "autenticar" via sinônimo bate em OAuth', () => {
  const idx = buildIndex(SAMPLE_DOCS);
  const r = search(idx, 'autenticar', { synonyms: SYNONYMS, limit: 3 });
  assert.ok(r.results.length >= 1);
  assert.equal(r.results[0].title, 'Gerar Chaves');
});

test('search: filtro topic restringe ao H1', () => {
  const idx = buildIndex(SAMPLE_DOCS);
  const r = search(idx, 'criar', { synonyms: SYNONYMS, topicH1: 'API de Produtos', limit: 5 });
  for (const item of r.results) {
    assert.equal(item.h1, 'API de Produtos');
  }
});

test('search: campo title boosta score', () => {
  const idx = buildIndex(SAMPLE_DOCS);
  const r = search(idx, 'products', { synonyms: SYNONYMS, limit: 5 });
  assert.ok(r.results.length >= 2);
  assert.ok(r.results[0].title.includes('products'));
});

test('search: query vazia retorna []', () => {
  const idx = buildIndex(SAMPLE_DOCS);
  const r = search(idx, '', { synonyms: SYNONYMS, limit: 5 });
  assert.deepEqual(r.results, []);
});

test('search: returns took/totalResults', () => {
  const idx = buildIndex(SAMPLE_DOCS);
  const r = search(idx, 'produto', { synonyms: SYNONYMS, limit: 5 });
  assert.equal(typeof r.took, 'number');
  assert.equal(typeof r.totalResults, 'number');
  assert.ok(Array.isArray(r.expandedQuery));
});
