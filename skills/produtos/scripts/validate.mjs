#!/usr/bin/env node
/**
 * CLI fino — delega para scripts/lib/validate-schema.mjs (runValidator v2).
 * Schemas: produto.create, produto.update em ../schemas/.
 *
 * Uso:
 *   node skills/produtos/scripts/validate.mjs --schema=produto.create '<payload>'
 *   node skills/produtos/scripts/validate.mjs --schema=produto.update '<payload>'
 *   node skills/produtos/scripts/validate.mjs --list-schemas
 */
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'produtos',
  usageExample: '--schema=produto.create \'{"Product":{"name":"Camiseta","price":49.90}}\'',
});
