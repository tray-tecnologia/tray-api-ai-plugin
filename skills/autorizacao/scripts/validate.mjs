#!/usr/bin/env node
/**
 * Valida um payload de autorização (POST /auth) da API Tray contra o schema local.
 * Uso: node skills/autorizacao/scripts/validate.mjs '<payload_json>'
 * Também aceita payload via stdin redirecionado.
 */
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'autorizacao',
  usageExample: '{"consumer_key":"abc","consumer_secret":"xyz","code":"123"}',
});
