#!/usr/bin/env node
/**
 * Servidor MCP da Tray. Expõe tray.search_docs e tray.validate via stdio.
 * Boot: `npm run mcp` ou `npx --package=@tray-tecnologia/tray-api-plugin tray-mcp`.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { findAllSchemas } from './lib/load-schemas.mjs';
import {
  searchDocsToolDefinition,
  handleSearchDocs,
} from './tools/search-docs.mjs';
import {
  validateToolDefinition,
  handleValidate,
} from './tools/validate.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

export async function createServer() {
  const schemaMap = findAllSchemas(ROOT);
  const server = new Server(
    { name: 'tray-mcp-server', version: PKG.version },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [searchDocsToolDefinition, validateToolDefinition],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    if (name === 'tray.search_docs') {
      return handleSearchDocs(args ?? {});
    }
    if (name === 'tray.validate') {
      return handleValidate(args ?? {}, schemaMap);
    }
    return {
      isError: true,
      content: [
        { type: 'text', text: JSON.stringify({ error: 'UNKNOWN_TOOL', name }) },
      ],
    };
  });

  return server;
}

async function main() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`tray-mcp-server v${PKG.version} listo (stdio).`);
}

if (
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((err) => {
    console.error('tray-mcp-server fatal:', err);
    process.exit(1);
  });
}
