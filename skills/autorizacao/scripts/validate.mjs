#!/usr/bin/env node
/**
 * CLI fino — delega para scripts/lib/validate-schema.mjs (runValidator v2).
 * Schemas: auth-request, auth-refresh em ../schemas/.
 *
 * Uso:
 *   node skills/autorizacao/scripts/validate.mjs --schema=auth-request '<payload>'
 *   node skills/autorizacao/scripts/validate.mjs --schema=auth-refresh '<payload>'
 *   node skills/autorizacao/scripts/validate.mjs --list-schemas
 */
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'autorizacao',
  usageExample: '--schema=auth-request \'{"consumer_key":"<env>","consumer_secret":"<env>","code":"<callback>"}\'',
});
