import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import "dotenv/config";

// Oura API base URL
const OURA_API_BASE = "https://api.ouraring.com/v2";

// Get access token from environment
const OURA_ACCESS_TOKEN = process.env.OURA_ACCESS_TOKEN;

if (!OURA_ACCESS_TOKEN) {
  console.error("Error: OURA_ACCESS_TOKEN environment variable is required");
  process.exit(1);
}

// ============ 🔴 高优先级改进 1: 错误重试机制 ============

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;  // milliseconds
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  );
  // 添加随机抖动避免请求风暴
  return delay + Math.random() * 1000;
}

// ============ 🔴 高优先级改进 2: 输入验证 ============

const DateValidationSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, "Invalid date")
  .refine((date) => {
    const parsed = new Date(date);
    const now = new Date();
    return parsed <= now;
  }, "Date cannot be in the future")
  .refine((date) => {
    const parsed = new Date(date);
    const minDate = new Date('2015-01-01'); // Oura API 最早日期
    return parsed >= minDate;
  }, "Date must be after 2015-01-01");

function validateDate(date: string | undefined, fieldName: string): string | Error {
  if (!date) return date as undefined as any; // 允许空值
  
  const result = DateValidationSchema.safeParse(date);
  if (!result.success) {
    return new Error(`Invalid ${fieldName}: ${result.error.issues[0].message}`);
  }
  return date;
}

function validateDateRange(startDate: string | undefined, endDate: string | undefined): { start: string; end: string } | Error {
  const startResult = validateDate(startDate, 'start_date');
  if (startResult instanceof Error) return startResult;
  
  const endResult = validateDate(endDate, 'end_date');
  if (endResult instanceof Error) return endResult;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return new Error('start_date cannot be after end_date');
    }
  }
  
  return { 
    start: startDate || getDefaultStartDate(), 
    end: endDate || getDefaultEndDate() 
  };
}

// ============ 🔴 高优先级改进 3: 速率限制处理 ============

class RateLimitError extends Error {
  public readonly retryAfter: number;
  
  constructor(retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// 主请求函数，包含重试和速率限制处理
async function ouraRequest(
  endpoint: string, 
  params?: Record<string, string>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<any> {
  const url = new URL(`${OURA_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${OURA_ACCESS_TOKEN}`,
        },
      });

      // 处理速率限制 (429)
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfter = retryAfterHeader 
          ? parseInt(retryAfterHeader, 10) 
          : 60; // 默认等待60秒
        
        console.error(`Rate limited. Waiting ${retryAfter} seconds...`);
        
        if (attempt < retryConfig.maxRetries) {
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new RateLimitError(retryAfter);
      }

      if (!response.ok) {
        const errorText = await response.text();
        
        // 5xx 服务器错误可重试
        if (response.status >= 500 && attempt < retryConfig.maxRetries) {
          const delay = calculateBackoff(attempt, retryConfig);
          console.error(`Server error ${response.status}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
          await sleep(delay);
          continue;
        }
        
        throw new Error(`Oura API error: ${response.status} - ${errorText}`);
      }

      return response.json();
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 网络错误可重试
      if (error instanceof TypeError && attempt < retryConfig.maxRetries) {
        const delay = calculateBackoff(attempt, retryConfig);
        console.error(`Network error. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      // RateLimitError 直接抛出
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // 其他错误直接抛出
      if (error instanceof Error && error.message.startsWith('Oura API error')) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Date helper functions
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Define tool schemas (不变)
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
    version: "1.1.0", // 版本升级
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

// Handle tool calls (增强错误处理)
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
  console.error("✅ Oura MCP server v1.1.0 running on stdio");
  console.error("   Features: retry logic, input validation, rate limit handling");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
