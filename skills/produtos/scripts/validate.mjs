#!/usr/bin/env node
/**
 * Valida um payload da API de Produtos da Tray contra o schema local.
 * Uso: node skills/produtos/scripts/validate.mjs '<payload_json>'
 * Também aceita payload via stdin redirecionado.
 */
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'produtos',
  usageExample: '{"Product":{"name":"Tênis Branco","price":"99.90"}}',
});
