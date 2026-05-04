#!/usr/bin/env node
/**
 * CLI fino — delega para scripts/lib/validate-schema.mjs (runValidator v2).
 */
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'pedidos',
  usageExample: '--schema=pedido.create \'{"Order":{"customer_id":1,"products":[{"product_id":1,"quantity":1}]}}\'',
});
