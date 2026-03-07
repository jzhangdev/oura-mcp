import "dotenv/config";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";

import { findTool, toMcpToolList } from "./tools/registry.js";
import { logger } from "./utils/logger.js";
import { RateLimitError } from "./utils/retry.js";
import { RuntimeValidationError, validateRuntime } from "./utils/runtime.js";

process.env.MCP_STDIO_MODE ??= "1";

const SERVER_NAME = "oura-mcp";
const SERVER_VERSION = "1.3.0";

type TextContent = { type: "text"; text: string };
type ToolArguments = Record<string, unknown>;
type ToolCallRequest = {
  params: {
    name: string;
    arguments?: ToolArguments;
  };
};

type ToolResponse = {
  content: TextContent[];
  isError?: boolean;
};

function formatError(error: unknown): string {
  if (error instanceof RateLimitError) {
    return `⏳ Rate limited by Oura API. Please wait ${error.retryAfter} seconds before trying again.`;
  }

  if (error instanceof ZodError) {
    return `❌ Validation Error: ${error.issues.map((issue) => issue.message).join("; ")}`;
  }

  if (error instanceof RuntimeValidationError) {
    return `⚙️ Runtime configuration error: ${error.message}`;
  }

  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (message.includes("401")) {
    return "🔐 Authentication failed. Please check your OURA_ACCESS_TOKEN.";
  }

  if (message.includes("403")) {
    return "🚫 Access forbidden. Your token may not have permission for this data.";
  }

  if (normalized.includes("network")) {
    return "🌐 Network error. Please check your internet connection.";
  }

  return message;
}

function textResponse(text: string, isError = false): ToolResponse {
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

async function handleToolCall(request: ToolCallRequest): Promise<ToolResponse> {
  const { name, arguments: args } = request.params;
  const tool = findTool(name);

  if (!tool) {
    return textResponse(`Unknown tool: ${name}`, true);
  }

  try {
    const result = await tool.handler((args ?? {}) as never);
    return textResponse(JSON.stringify(result, null, 2));
  } catch (error) {
    const message = formatError(error);
    logger.error(`Tool call failed: ${name}`, { error: message });
    return textResponse(message, true);
  }
}

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toMcpToolList(),
}));

server.setRequestHandler(CallToolRequestSchema, handleToolCall);

async function main(): Promise<void> {
  validateRuntime();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
