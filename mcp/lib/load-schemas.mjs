/**
 * Descobre e carrega schemas de skills/<recurso>/schemas/*.json em memória.
 * Usado pelo MCP server para resolver `tray.validate({schema: <nome>, ...})`.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

export function findAllSchemas(rootDir) {
  const map = new Map();
  const skillsDir = join(rootDir, 'skills');
  if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) {
    return map;
  }

  for (const skillName of readdirSync(skillsDir)) {
    const skillPath = join(skillsDir, skillName);
    if (!existsSync(skillPath) || !statSync(skillPath).isDirectory()) {
      continue;
    }
    const schemasDir = join(skillPath, 'schemas');
    if (!existsSync(schemasDir) || !statSync(schemasDir).isDirectory()) {
      continue;
    }

    for (const file of readdirSync(schemasDir)) {
      if (!file.endsWith('.json')) {
        continue;
      }
      const fullPath = resolve(join(schemasDir, file));
      if (!statSync(fullPath).isFile()) {
        continue;
      }
      const schemaName = basename(file, '.json');
      const raw = readFileSync(fullPath, 'utf8');
      const schema = JSON.parse(raw);

      if (map.has(schemaName)) {
        const existingPath = map.get(schemaName).path;
        throw new Error(
          `Colisão de schema "${schemaName}": ${existingPath} e ${fullPath}`,
        );
      }
      map.set(schemaName, { path: fullPath, schema });
    }
  }

  return map;
}

export function loadSchema(name, schemaMap) {
  const entry = schemaMap.get(name);
  if (!entry) {
    throw new Error(`SCHEMA_NOT_FOUND: ${name}`);
  }
  return entry;
}
