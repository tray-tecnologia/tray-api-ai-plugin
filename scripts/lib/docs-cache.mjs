import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';

export function hashContent(text) {
  return 'sha256:' + createHash('sha256').update(text).digest('hex');
}

export async function writeCache(dir, { raw, parsed, index }, ttlMs) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'raw.html'), raw, 'utf8');
  await writeFile(join(dir, 'parsed.md'), parsed, 'utf8');
  await writeFile(join(dir, 'index.json'), JSON.stringify(index), 'utf8');
  const metadata = {
    fetchedAt: new Date().toISOString(),
    ttlMs,
    sourceHash: hashContent(raw),
    indexVersion: '1.0.0'
  };
  await writeFile(join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
}

export async function readCache(dir) {
  if (!existsSync(join(dir, 'metadata.json'))) return null;
  try {
    const raw = await readFile(join(dir, 'raw.html'), 'utf8');
    const parsed = await readFile(join(dir, 'parsed.md'), 'utf8');
    const index = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8'));
    const metadata = JSON.parse(await readFile(join(dir, 'metadata.json'), 'utf8'));
    return { raw, parsed, index, metadata };
  } catch {
    return null;
  }
}

export function isFresh(metadata) {
  if (!metadata?.fetchedAt || typeof metadata.ttlMs !== 'number') return false;
  const age = Date.now() - new Date(metadata.fetchedAt).getTime();
  return age < metadata.ttlMs;
}

export async function clearCache(dir) {
  await rm(dir, { recursive: true, force: true });
}

export function defaultCacheDir() {
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return process.env.TRAY_DOCS_CACHE_DIR || join(home, '.cache', 'tray-plugin', 'dev-docs');
}

export function defaultTTL() {
  const env = parseInt(process.env.TRAY_DOCS_CACHE_TTL_MS || '', 10);
  return Number.isFinite(env) && env > 0 ? env : 86400000;
}
