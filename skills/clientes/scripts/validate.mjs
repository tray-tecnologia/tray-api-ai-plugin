#!/usr/bin/env node
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'clientes',
  usageExample: '--schema=cliente.create \'{"Customer":{"name":"<nome>","email":"<email>"}}\'',
});
