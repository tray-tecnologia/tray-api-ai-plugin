#!/usr/bin/env node
/**
 * Valida o payload de um Webhook recebido da Tray contra o schema local.
 * Uso: node skills/webhooks/scripts/validate.mjs '<payload_json>'
 * Também aceita payload via stdin redirecionado.
 *
 * Os campos chegam como form-urlencoded; passe o payload já parseado como JSON.
 */
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'webhooks',
  usageExample: '{"seller_id":"100","scope_id":"200","scope_name":"order","act":"insert"}',
});
