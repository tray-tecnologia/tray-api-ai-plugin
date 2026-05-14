#!/usr/bin/env node
/**
 * CLI fino — delega para scripts/lib/validate-schema.mjs (runValidator v2).
 * Schemas: variacao.create, variacao.update.
 */
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'variacoes',
  usageExample: '--schema=variacao.create \'{"Variant":{"sku":"CAM-AZ-M","price":49.9}}\'',
});
