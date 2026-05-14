/**
 * Descobre e carrega schemas de skills/<recurso>/schemas/*.json em memória.
 * Usado pelo MCP server para resolver `tray.validate({schema: <nome>, ...})`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

/**
 * @param {string} rootDir
 * @returns {Map<string, { path: string, schema: object }>}
 */
export function findAllSchemas(rootDir) {
  const skillsDir = resolve(join(rootDir, 'skills'));
  const map = new Map();

  const skillEntries = readdirSync(skillsDir, { withFileTypes: true });
  for (const dirent of skillEntries) {
    if (!dirent.isDirectory()) continue;

    const schemasDir = join(skillsDir, dirent.name, 'schemas');
    let st;
    try {
      st = statSync(schemasDir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;

    const files = readdirSync(schemasDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const schemaName = basename(file, '.json');
      const absPath = resolve(join(schemasDir, file));
      const raw = readFileSync(absPath, 'utf8');
      const schema = JSON.parse(raw);

      const prev = map.get(schemaName);
      if (prev) {
        throw new Error(
          `Schema name collision for "${schemaName}": ${prev.path} | ${absPath}`
        );
      }

      map.set(schemaName, { path: absPath, schema });
    }
  }

  return map;
}

/**
 * @param {string} name
 * @param {Map<string, { path: string, schema: object }>} schemaMap
 * @returns {{ path: string, schema: object }}
 */
export function loadSchema(name, schemaMap) {
  const entry = schemaMap.get(name);
  if (!entry) {
    throw new Error(`SCHEMA_NOT_FOUND: ${name}`);
  }
  return entry;
}
