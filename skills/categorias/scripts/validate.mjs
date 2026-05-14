#!/usr/bin/env node
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'categorias',
  usageExample: '--schema=categoria.create \'{"Category":{"name":"Masculino"}}\'',
});
