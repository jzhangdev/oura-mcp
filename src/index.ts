import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";

import { logger } from './utils/logger.js';
import { tools } from './tools/registry.js';
import { RateLimitError } from './utils/retry.js';

function ensureRuntime() {
  const token = process.env.OURA_ACCESS_TOKEN;
  if (!token) {
    logger.error("Missing OURA_ACCESS_TOKEN. Set it in environment or .env file.");
    process.exit(1);
  }
  const [major] = process.versions.node.split('.').map(Number);
  if (!major || major < 18) {
    logger.error(`Node.js >= 18 is required (for global fetch). Current: ${process.version}`);
    process.exit(1);
  }
}

ensureRuntime();

// Create MCP server
const server = new Server(
  {
    name: "oura-mcp",
    version: "1.3.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools from registry
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: (t as any).schema ? zodToJsonSchema((t as any).schema) : { type: 'object', properties: {} },
    })),
  };
});

// Handle tool calls via registry
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await tool.handler(args ?? {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    let detailedMessage = errorMessage;
    if (error instanceof RateLimitError) {
      detailedMessage = `⏳ Rate limited by Oura API. Please wait ${error.retryAfter} seconds before trying again.`;
    } else if (errorMessage.includes('Invalid')) {
      detailedMessage = `❌ Validation Error: ${errorMessage}`;
    } else if (errorMessage.includes('401')) {
      detailedMessage = '🔐 Authentication failed. Please check your OURA_ACCESS_TOKEN.';
    } else if (errorMessage.includes('403')) {
      detailedMessage = '🚫 Access forbidden. Your token may not have permission for this data.';
    } else if (errorMessage.toLowerCase().includes('network')) {
      detailedMessage = '🌐 Network error. Please check your internet connection.';
    }

    logger.error(`Tool call failed: ${name}`, { error: detailedMessage });

    return {
      content: [
        {
          type: "text",
          text: detailedMessage,
        },
      ],
      isError: true,
    };
  }
});

// Very small helper since we no longer import z directly here
function zodToJsonSchema(schema: any): any {
  const def = schema?._def;
  if (def && def.typeName === (global as any).ZodFirstPartyTypeKind?.ZodObject) {
    // Not available here; fallback to simple reflection below
  }
  try {
    const shape = (schema as any).shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const key of Object.keys(shape || {})) {
      const field = shape[key];
      const isOptional = field?.isOptional?.() ?? field?._def?.isOptional ?? false;
      const desc = field?.description ?? field?._def?.description;
      properties[key] = { type: 'string', description: desc };
      if (!isOptional) required.push(key);
    }
    const json: any = { type: 'object', properties };
    if (required.length) json.required = required;
    return json;
  } catch {
    return { type: 'object', properties: {} };
  }
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Oura MCP server v1.3.0 running on stdio");
  logger.info("Features: modular tools, pagination, improved error handling, input validation, rate limit handling");
}

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
