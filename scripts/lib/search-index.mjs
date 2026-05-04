import { stem } from './stemmer-pt-br.mjs';
import { splitMarkdown } from './markdown-splitter.mjs';
import { writeCache, readCache, isFresh, hashContent } from './docs-cache.mjs';

const STOPWORDS = new Set([
  'a','o','de','do','da','dos','das','e','é','em','na','no','nas','nos',
  'para','por','com','um','uma','uns','umas','os','as','que','se','sua','seu',
  'suas','seus','como','ou','ao','à','às','aos','pelo','pela','pelos','pelas',
  'mais','mas','ser','sao','tem'
]);

function normalize(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function tokenize(text) {
  if (typeof text !== 'string') return [];
  const norm = normalize(text);
  const words = norm.match(/[a-z0-9]+/g) || [];
  const out = [];
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    out.push(stem(w));
  }
  return out;
}

export function expandSynonyms(stemmedQueryTokens, synonyms) {
  if (!synonyms?.groups) return [...stemmedQueryTokens];
  const expanded = new Set(stemmedQueryTokens);
  for (const t of stemmedQueryTokens) {
    for (const g of synonyms.groups) {
      const allTerms = [g.primary, ...g.synonyms];
      const stemmedTerms = allTerms.map(x => stem(normalize(x.split(' ')[0])));
      if (stemmedTerms.includes(t)) {
        for (const term of stemmedTerms) expanded.add(term);
      }
    }
  }
  return [...expanded];
}

function tokensFromSection(section) {
  return {
    title: tokenize(section.title || ''),
    code: section.code?.flatMap(c => tokenize(c.content)) || [],
    body: tokenize(section.body || '')
  };
}

export function buildIndex(documents) {
  const docs = documents.map((d, i) => {
    const tokens = tokensFromSection(d);
    const allTokens = [...tokens.title, ...tokens.code, ...tokens.body];
    return {
      ...d,
      id: `${d.anchor || i}`,
      tokens,
      length: allTokens.length
    };
  });
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / Math.max(docs.length, 1);
  const docFreq = {};
  for (const d of docs) {
    const seen = new Set();
    for (const t of [...d.tokens.title, ...d.tokens.code, ...d.tokens.body]) {
      if (seen.has(t)) continue;
      seen.add(t);
      docFreq[t] = (docFreq[t] || 0) + 1;
    }
  }
  return {
    version: '1.0.0',
    documents: docs,
    docFreq,
    termFreq: null,
    avgdl,
    N: docs.length
  };
}

const FIELD_BOOST = { title: 3, code: 1.5, body: 1 };
const K1 = 1.5;
const B = 0.75;

function tfBoosted(d, term) {
  let tf = 0;
  for (const f of ['title','code','body']) {
    const c = d.tokens[f].filter(x => x === term).length;
    tf += FIELD_BOOST[f] * c;
  }
  return tf;
}

function idf(N, df) {
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

export function search(index, queryRaw, { synonyms = null, topicH1 = null, limit = 5, topicsMap = null } = {}) {
  const t0 = Date.now();
  const empty = { query: queryRaw, expandedQuery: [], results: [], totalResults: 0, took: 0 };
  if (!queryRaw || typeof queryRaw !== 'string' || !queryRaw.trim()) {
    return empty;
  }
  const queryTokens = tokenize(queryRaw);
  if (queryTokens.length === 0) {
    return { ...empty, query: queryRaw };
  }
  const expanded = synonyms ? expandSynonyms(queryTokens, synonyms) : queryTokens;
  const candidates = topicH1
    ? index.documents.filter(d => d.h1 === topicH1)
    : index.documents;
  const scored = [];
  for (const d of candidates) {
    let score = 0;
    for (const t of expanded) {
      const df = index.docFreq[t] || 0;
      if (df === 0) continue;
      const tf = tfBoosted(d, t);
      if (tf === 0) continue;
      const idfT = idf(index.N, df);
      const num = tf * (K1 + 1);
      const den = tf + K1 * (1 - B + B * d.length / index.avgdl);
      score += idfT * (num / den);
    }
    if (score > 0) scored.push({ doc: d, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).map(({ doc, score }) => {
    let topic = null;
    if (topicsMap) {
      for (const [slug, h1Name] of Object.entries(topicsMap)) {
        if (h1Name === doc.h1) { topic = slug; break; }
      }
    }
    return {
      title: doc.title,
      url: `https://developers.tray.com.br/#${doc.anchor}`,
      snippet: (doc.body || '').slice(0, 200),
      score: Math.round(score * 100) / 100,
      topic,
      h1: doc.h1,
      level: doc.level,
      anchor: doc.anchor
    };
  });
  return {
    query: queryRaw,
    expandedQuery: expanded,
    results: top,
    totalResults: scored.length,
    took: Date.now() - t0
  };
}

async function fetchSpa(baseUrl) {
  const headers = {
    'User-Agent': `tray-ai-toolkit/1.4.0 (${process.platform})`,
    'X-Tray-AI-Source': 'plugin'
  };
  if (process.env.OPT_OUT_INSTRUMENTATION !== 'true') {
    headers['X-Tray-AI-Telemetry'] = 'on';
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(baseUrl, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadOrFetch({ cacheDir, ttlMs, baseUrl, forceRefresh = false }) {
  const existing = await readCache(cacheDir);
  if (!forceRefresh && existing && isFresh(existing.metadata)) {
    return {
      index: existing.index,
      cache: {
        hit: true,
        ageMs: Date.now() - new Date(existing.metadata.fetchedAt).getTime(),
        ttlMs: existing.metadata.ttlMs
      }
    };
  }
  let raw;
  try {
    raw = await fetchSpa(baseUrl);
  } catch (e) {
    if (existing) {
      return {
        index: existing.index,
        cache: {
          hit: true,
          stale: true,
          ageMs: Date.now() - new Date(existing.metadata.fetchedAt).getTime(),
          ttlMs: existing.metadata.ttlMs,
          warning: 'Doc desatualizada — rede indisponível'
        }
      };
    }
    const err = new Error('OFFLINE_NO_CACHE: rede indisponível e sem cache local');
    err.code = 'OFFLINE_NO_CACHE';
    throw err;
  }
  const sourceHash = hashContent(raw);
  if (existing && existing.metadata.sourceHash === sourceHash) {
    await writeCache(cacheDir, { raw, parsed: existing.parsed, index: existing.index }, ttlMs);
    return {
      index: existing.index,
      cache: { hit: false, refreshed: true, sameContent: true }
    };
  }
  const docs = splitMarkdown(raw);
  const index = buildIndex(docs);
  await writeCache(cacheDir, { raw, parsed: raw, index }, ttlMs);
  return {
    index,
    cache: existing
      ? { hit: false, refreshed: true }
      : { hit: false, initial: true }
  };
}
