#!/usr/bin/env node
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'marcas',
  usageExample: '--schema=marca.create \'{"Brand":{"name":"Nike","slug":"nike"}}\'',
});
