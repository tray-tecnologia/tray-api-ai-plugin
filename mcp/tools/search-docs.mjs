/**
 * Tool MCP `tray.search_docs`: busca BM25 em developers.tray.com.br.
 * Reusa search-index/loadOrFetch das libs P1.2; índice memoizado entre chamadas.
 */
import { z } from 'zod';
import { search, loadOrFetch } from '../../scripts/lib/search-index.mjs';
import { TOPICS_MAP, topicToH1, listTopics } from '../../scripts/lib/topics-map.mjs';
import { defaultCacheDir, defaultTTL } from '../../scripts/lib/docs-cache.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SYNONYMS = JSON.parse(
  readFileSync(join(__dir, '../../skills/tray-dev/assets/synonyms-pt-br.json'), 'utf-8')
);

const DEFAULT_BASE_URL = 'https://developers.tray.com.br/';

let cachedIndex = null;
let cachedMeta = null;

export const searchDocsInputSchema = z.object({
  query: z.string().min(1, 'query é obrigatória.'),
  topic: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export const searchDocsToolDefinition = {
  name: 'tray.search_docs',
  description:
    'Busca semântica (BM25) na documentação developers.tray.com.br. ' +
    'Use antes de gerar código ou responder dúvidas — a fonte é mais ' +
    'atualizada que o conhecimento interno do agente. Retorna trechos ' +
    'com h1, h2, snippet e URL com âncora. Tópicos suportados: ' +
    listTopics().join(', ') +
    '. Modo offline funciona se já houver cache local.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Termo da busca (PT-BR ou EN).' },
      topic: {
        type: 'string',
        description:
          'Restrição opcional por tópico (slug). Ex.: "produtos", "pedidos", "autorizacao".',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        default: 5,
        description: 'Número máximo de trechos retornados (1-20). Default 5.',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};

export async function handleSearchDocs(input, opts = {}) {
  let parsed;
  try {
    parsed = searchDocsInputSchema.parse(input);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const text = JSON.stringify({
        error: 'INVALID_INPUT',
        message: e.issues[0]?.message ?? 'Invalid input',
        issues: e.issues,
      });
      return { isError: true, content: [{ type: 'text', text }] };
    }
    throw e;
  }

  let topicH1 = null;
  if (parsed.topic !== undefined && parsed.topic !== '') {
    if (!(parsed.topic in TOPICS_MAP)) {
      const text = JSON.stringify({
        error: 'INVALID_TOPIC',
        topic: parsed.topic,
        available: listTopics(),
      });
      return { isError: true, content: [{ type: 'text', text }] };
    }
    topicH1 = topicToH1(parsed.topic);
  }

  if (!cachedIndex || opts.forceReload) {
    try {
      const { index, cache } = await loadOrFetch({
        cacheDir: opts.cacheDir ?? defaultCacheDir(),
        ttlMs: opts.ttlMs ?? defaultTTL(),
        baseUrl: opts.baseUrl ?? DEFAULT_BASE_URL,
      });
      cachedIndex = index;
      cachedMeta = cache;
    } catch (e) {
      if (e?.code === 'OFFLINE_NO_CACHE') {
        const text = JSON.stringify({
          error: 'OFFLINE_NO_CACHE',
          message: e.message,
        });
        return { isError: true, content: [{ type: 'text', text }] };
      }
      throw e;
    }
  }

  const out = search(cachedIndex, parsed.query, {
    synonyms: SYNONYMS,
    topicH1,
    limit: parsed.limit,
    topicsMap: TOPICS_MAP,
  });

  const text = JSON.stringify({
    query: out.query ?? parsed.query,
    expandedQuery: out.expandedQuery ?? null,
    topic: parsed.topic ?? null,
    limit: parsed.limit,
    totalResults: out.totalResults ?? out.results?.length ?? 0,
    results: out.results ?? [],
    took: out.took ?? null,
    cache: cachedMeta,
  });
  return { content: [{ type: 'text', text }] };
}

export function _resetCache() {
  cachedIndex = null;
  cachedMeta = null;
}
