import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import "dotenv/config";

import { logger } from './utils/logger.js';
import { validateDate, validateDateRange, getDefaultStartDate, getDefaultEndDate } from './utils/date.js';
import { ouraRequest } from './api/ouraClient.js';
import { RateLimitError } from './utils/retry.js';

// Define tool schemas
const GetSleepDataSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

const GetActivityDataSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

const GetReadinessDataSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

const GetHeartRateSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

const GetWorkoutsSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

const GetDailySleepSchema = z.object({
  date: z.string().describe("Date (YYYY-MM-DD)"),
});

const GetSessionsSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

// Create MCP server
const server = new Server(
  {
    name: "oura-mcp",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_sleep_data",
        description: "Get sleep data including duration, quality, sleep stages, and sleep score. Returns detailed sleep metrics for the specified date range.",
        inputSchema: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format (default: 7 days ago)",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format (default: today)",
            },
          },
        },
      },
      {
        name: "get_activity_data",
        description: "Get daily activity metrics including steps, calories, active time, and activity score.",
        inputSchema: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format (default: 7 days ago)",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format (default: today)",
            },
          },
        },
      },
      {
        name: "get_readiness_data",
        description: "Get readiness score and contributors (sleep, activity, recovery). The readiness score indicates how prepared your body is for the day.",
        inputSchema: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format (default: 7 days ago)",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format (default: today)",
            },
          },
        },
      },
      {
        name: "get_heart_rate",
        description: "Get heart rate data including resting heart rate and heart rate variability.",
        inputSchema: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format (default: 7 days ago)",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format (default: today)",
            },
          },
        },
      },
      {
        name: "get_workouts",
        description: "Get workout records including activity type, duration, intensity, and heart rate data.",
        inputSchema: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format (default: 7 days ago)",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format (default: today)",
            },
          },
        },
      },
      {
        name: "get_daily_sleep",
        description: "Get sleep summary for a specific day including bedtime, sleep phases, and sleep efficiency.",
        inputSchema: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date in YYYY-MM-DD format",
            },
          },
          required: ["date"],
        },
      },
      {
        name: "get_sessions",
        description: "Get tagged sessions such as meditation, nap, or other activities you've logged.",
        inputSchema: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format (default: 7 days ago)",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format (default: today)",
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "get_sleep_data": {
        const params = GetSleepDataSchema.parse(args);
        const dateRange = validateDateRange(params.start_date, params.end_date);
        if (dateRange instanceof Error) throw dateRange;
        result = await ouraRequest("/usercollection/daily_sleep", {
          start_date: dateRange.start,
          end_date: dateRange.end,
        });
        break;
      }

      case "get_activity_data": {
        const params = GetActivityDataSchema.parse(args);
        const dateRange = validateDateRange(params.start_date, params.end_date);
        if (dateRange instanceof Error) throw dateRange;
        result = await ouraRequest("/usercollection/daily_activity", {
          start_date: dateRange.start,
          end_date: dateRange.end,
        });
        break;
      }

      case "get_readiness_data": {
        const params = GetReadinessDataSchema.parse(args);
        const dateRange = validateDateRange(params.start_date, params.end_date);
        if (dateRange instanceof Error) throw dateRange;
        result = await ouraRequest("/usercollection/daily_readiness", {
          start_date: dateRange.start,
          end_date: dateRange.end,
        });
        break;
      }

      case "get_heart_rate": {
        const params = GetHeartRateSchema.parse(args);
        const dateRange = validateDateRange(params.start_date, params.end_date);
        if (dateRange instanceof Error) throw dateRange;
        result = await ouraRequest("/usercollection/heartrate", {
          start_datetime: `${dateRange.start}T00:00:00Z`,
          end_datetime: `${dateRange.end}T23:59:59Z`,
        });
        break;
      }

      case "get_workouts": {
        const params = GetWorkoutsSchema.parse(args);
        const dateRange = validateDateRange(params.start_date, params.end_date);
        if (dateRange instanceof Error) throw dateRange;
        result = await ouraRequest("/usercollection/workout", {
          start_date: dateRange.start,
          end_date: dateRange.end,
        });
        break;
      }

      case "get_daily_sleep": {
        const params = GetDailySleepSchema.parse(args);
        const dateValidation = validateDate(params.date, 'date');
        if (dateValidation instanceof Error) throw dateValidation;
        result = await ouraRequest("/usercollection/daily_sleep", {
          start_date: params.date,
          end_date: params.date,
        });
        break;
      }

      case "get_sessions": {
        const params = GetSessionsSchema.parse(args);
        const dateRange = validateDateRange(params.start_date, params.end_date);
        if (dateRange instanceof Error) throw dateRange;
        result = await ouraRequest("/usercollection/session", {
          start_date: dateRange.start,
          end_date: dateRange.end,
        });
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

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
    
    // 增强的错误消息
    let detailedMessage = errorMessage;
    if (error instanceof RateLimitError) {
      detailedMessage = `⏳ Rate limited by Oura API. Please wait ${error.retryAfter} seconds before trying again.`;
    } else if (errorMessage.includes('Invalid')) {
      detailedMessage = `❌ Validation Error: ${errorMessage}`;
    } else if (errorMessage.includes('Oura API error: 401')) {
      detailedMessage = '🔐 Authentication failed. Please check your OURA_ACCESS_TOKEN.';
    } else if (errorMessage.includes('Oura API error: 403')) {
      detailedMessage = '🚫 Access forbidden. Your token may not have permission for this data.';
    } else if (errorMessage.includes('Network error')) {
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Oura MCP server v1.2.0 running on stdio");
  logger.info("Features: modular architecture, logging system, retry logic, input validation, rate limit handling");
}

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
