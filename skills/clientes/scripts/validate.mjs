#!/usr/bin/env node
/**
 * Valida um payload da API de Clientes da Tray contra o schema local.
 * Uso: node skills/clientes/scripts/validate.mjs '<payload_json>'
 * Também aceita payload via stdin redirecionado.
 */
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'clientes',
  usageExample: '{"Customer":{"name":"João Silva","email":"joao@exemplo.com"}}',
});
