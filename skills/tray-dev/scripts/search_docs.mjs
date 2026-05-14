#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { search, loadOrFetch } from '../../../scripts/lib/search-index.mjs';
import { TOPICS_MAP, listTopics, topicToH1 } from '../../../scripts/lib/topics-map.mjs';
import { defaultCacheDir, defaultTTL } from '../../../scripts/lib/docs-cache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYN_PATH = join(__dirname, '..', 'assets', 'synonyms-pt-br.json');
const VERSION = '1.0.0';

function printHelp() {
  process.stderr.write(`search_docs ${VERSION}

Uso:
  node skills/tray-dev/scripts/search_docs.mjs "<query>"
  node skills/tray-dev/scripts/search_docs.mjs --topic=<slug> "<query>"
  node skills/tray-dev/scripts/search_docs.mjs --json "<query>"
  node skills/tray-dev/scripts/search_docs.mjs --limit=<n> "<query>"
  node skills/tray-dev/scripts/search_docs.mjs --no-cache "<query>"
  node skills/tray-dev/scripts/search_docs.mjs --refresh
  node skills/tray-dev/scripts/search_docs.mjs --list-topics
  node skills/tray-dev/scripts/search_docs.mjs --help

Exit codes: 0 ok | 1 erro execução | 2 erro de uso
`);
}

function parseArgs(argv) {
  const out = { topic: null, json: false, limit: 5, noCache: false, refresh: false, listTopics: false, help: false, query: null };
  const positional = [];
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--no-cache') out.noCache = true;
    else if (a === '--refresh') out.refresh = true;
    else if (a === '--list-topics') out.listTopics = true;
    else if (a.startsWith('--topic=')) out.topic = a.slice('--topic='.length);
    else if (a.startsWith('--limit=')) out.limit = parseInt(a.slice('--limit='.length), 10) || 5;
    else if (a.startsWith('--')) { out.unknownFlag = a; }
    else positional.push(a);
  }
  if (positional.length > 0) out.query = positional.join(' ');
  return out;
}

async function loadSynonyms() {
  try {
    return JSON.parse(await readFile(SYN_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function emitJsonError(code, message, suggestion) {
  process.stdout.write(JSON.stringify({ valid: false, error: { code, message, suggestion } }, null, 2) + '\n');
}

function emitHumanError(message) {
  process.stderr.write(`❌ ${message}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }
  if (args.unknownFlag) {
    if (args.json) emitJsonError('UNKNOWN_FLAG', `flag desconhecida: ${args.unknownFlag}`, '--help');
    else emitHumanError(`Flag desconhecida: ${args.unknownFlag}. Use --help.`);
    process.exit(2);
  }
  if (args.listTopics) {
    const topics = listTopics();
    if (args.json) {
      process.stdout.write(JSON.stringify({ topics }, null, 2) + '\n');
    } else {
      process.stdout.write('Tópicos disponíveis:\n' + topics.map(t => '  - ' + t).join('\n') + '\n');
    }
    process.exit(0);
  }

  let topicH1 = null;
  if (args.topic) {
    topicH1 = topicToH1(args.topic);
    if (!topicH1) {
      const msg = `topic '${args.topic}' não existe`;
      if (args.json) emitJsonError('INVALID_TOPIC', msg, 'use --list-topics');
      else emitHumanError(`${msg}. Use --list-topics para ver os disponíveis.`);
      process.exit(2);
    }
  }

  const cacheDir = defaultCacheDir();
  const ttlMs = defaultTTL();
  const baseUrl = process.env.TRAY_DOCS_BASE_URL || 'https://developers.tray.com.br';

  let loaded;
  try {
    loaded = await loadOrFetch({ cacheDir, ttlMs, baseUrl, forceRefresh: args.noCache || args.refresh });
  } catch (e) {
    const msg = e.message || 'erro ao carregar índice';
    if (args.json) emitJsonError(e.code || 'LOAD_ERROR', msg, 'verifique conexão e tente --refresh quando online');
    else emitHumanError(msg);
    process.exit(1);
  }

  if (args.refresh && !args.query) {
    if (args.json) {
      process.stdout.write(JSON.stringify({ refreshed: true, cache: loaded.cache }, null, 2) + '\n');
    } else {
      process.stdout.write('📥 Índice atualizado.\n');
    }
    process.exit(0);
  }

  if (!args.query || !args.query.trim()) {
    const msg = 'query vazia';
    if (args.json) emitJsonError('EMPTY_QUERY', msg, 'forneça um termo entre aspas');
    else emitHumanError(`${msg}. Forneça um termo entre aspas. Veja --help.`);
    process.exit(2);
  }

  const synonyms = await loadSynonyms();
  const r = search(loaded.index, args.query, {
    synonyms,
    topicH1,
    limit: args.limit,
    topicsMap: TOPICS_MAP
  });

  if (args.json) {
    process.stdout.write(JSON.stringify({
      query: r.query,
      expandedQuery: r.expandedQuery,
      topic: args.topic,
      results: r.results,
      totalResults: r.totalResults,
      took: r.took,
      cache: loaded.cache,
      indexVersion: loaded.index.version || '1.0.0'
    }, null, 2) + '\n');
    process.exit(0);
  }

  process.stdout.write(`🔍 Busca: "${r.query}"\n`);
  const cacheNote = loaded.cache.hit
    ? `cache hit${loaded.cache.stale ? ' (stale, doc pode estar desatualizada)' : ''}`
    : `cache miss (atualizado agora)`;
  process.stdout.write(`   ${cacheNote} · ${r.took}ms · ${r.totalResults} resultado(s)\n\n`);
  if (r.results.length === 0) {
    process.stdout.write('Nenhum resultado. Tente outros termos ou --topic=<recurso>.\n');
    process.exit(0);
  }
  r.results.forEach((it, i) => {
    process.stdout.write(`${i+1}. [${it.topic || it.h1}] ${it.title}  (score ${it.score})\n`);
    process.stdout.write(`   ${it.url}\n`);
    process.stdout.write(`   ${it.snippet.slice(0, 180)}${it.snippet.length > 180 ? '...' : ''}\n\n`);
  });
  process.exit(0);
}

main().catch(e => {
  process.stderr.write(`Erro inesperado: ${e.stack || e.message}\n`);
  process.exit(1);
});
