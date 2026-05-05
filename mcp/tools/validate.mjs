/**
 * Tool MCP `tray.validate`: valida payload contra schema local da skill.
 * Reusa `validatePayload` de `scripts/lib/validate-schema.mjs`.
 */
import { z } from 'zod';
import { validatePayload } from '../../scripts/lib/validate-schema.mjs';
import { loadSchema } from '../lib/load-schemas.mjs';

// Zod schema do input (não exposto ao MCP, usado para parse interno).
export const validateInputSchema = z.object({
  schema: z.string().min(1, 'schema é obrigatório.').describe('Nome do schema (ex.: "produto.create").'),
  payload: z.record(z.unknown()).describe('Objeto JSON a validar.'),
});

// Definição da tool conforme protocolo MCP.
export const validateToolDefinition = {
  name: 'tray.validate',
  description:
    'Valida estruturalmente um payload JSON contra um schema da Tray ' +
    '(skills/<recurso>/schemas/*.json). Retorna lista de erros com path, ' +
    'keyword, message e hint para correção. Use antes de enviar à API. ' +
    'Lista de schemas disponíveis: produto.create, produto.update, pedido.create, ' +
    'pedido.update, cliente.create, cliente.update, webhook.payload, ' +
    'variacao.create, variacao.update, categoria.create, categoria.update, ' +
    'marca.create, marca.update, auth-request, auth-refresh.',
  inputSchema: {
    type: 'object',
    properties: {
      schema: {
        type: 'string',
        description: 'Nome do schema (ex.: "produto.create").',
      },
      payload: {
        type: 'object',
        additionalProperties: true,
        description: 'Objeto JSON a validar.',
      },
    },
    required: ['schema', 'payload'],
    additionalProperties: false,
  },
};

/**
 * @param {unknown} input
 * @param {Map<string, { path: string, schema: object }>} schemaMap
 */
export async function handleValidate(input, schemaMap) {
  try {
    const parsed = validateInputSchema.parse(input);

    let entry;
    try {
      entry = loadSchema(parsed.schema, schemaMap);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('SCHEMA_NOT_FOUND:')) {
        const text = JSON.stringify({
          error: 'SCHEMA_NOT_FOUND',
          schema: parsed.schema,
          available: Array.from(schemaMap.keys()).sort(),
        });
        return { isError: true, content: [{ type: 'text', text }] };
      }
      throw e;
    }

    let payload = parsed.payload;
    const { schema } = entry;
    if (
      schema.title &&
      payload[schema.title] &&
      typeof payload[schema.title] === 'object' &&
      !Array.isArray(payload[schema.title])
    ) {
      payload = payload[schema.title];
    }

    const errors = validatePayload(schema, payload);
    const valid = errors.length === 0;
    const text = JSON.stringify({
      valid,
      schema: parsed.schema,
      errors,
    });
    return { content: [{ type: 'text', text }] };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const text = JSON.stringify({
        error: 'INVALID_INPUT',
        message: e.issues[0]?.message ?? 'Invalid input',
        issues: e.issues,
      });
      return { isError: true, content: [{ type: 'text', text }] };
    }
    throw e;
  }
}
