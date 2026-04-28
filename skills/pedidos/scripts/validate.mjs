#!/usr/bin/env node
/**
 * Valida um payload da API de Pedidos da Tray contra o schema local.
 * Uso: node skills/pedidos/scripts/validate.mjs '<payload_json>'
 * Também aceita payload via stdin redirecionado.
 */
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'pedidos',
  usageExample: '{"Order":{"client_id":1,"payment_form":"Boleto"}}',
});
