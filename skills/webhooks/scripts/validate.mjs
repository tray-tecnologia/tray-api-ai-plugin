#!/usr/bin/env node
import { runValidator } from '../../../scripts/lib/validate-schema.mjs';

await runValidator({
  callerUrl: import.meta.url,
  skillName: 'webhooks',
  usageExample: '\'{"seller_id":1,"scope_id":1,"scope_name":"order","act":"insert"}\'',
});
