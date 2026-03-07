import { z } from "zod";

import { fetchAllPages } from "../api/pagination.js";
import { ouraRequest } from "../api/ouraClient.js";
import {
  GetActivityDataSchema,
  GetDailySleepSchema,
  GetHeartRateSchema,
  GetProfileSchema,
  GetReadinessDataSchema,
  GetSessionsSchema,
  GetSleepDataSchema,
  GetWorkoutsSchema,
  PingSchema,
} from "../schemas/tools.js";
import { validateDate, validateDateRange } from "../utils/date.js";

type JsonSchema = Record<string, unknown>;
type Params = Record<string, string | undefined>;
type ToolSchema = z.ZodTypeAny;
type DateRangeArgs = {
  start_date?: string;
  end_date?: string;
};

type RangeToolName =
  | "get_sleep_data"
  | "get_activity_data"
  | "get_readiness_data"
  | "get_heart_rate"
  | "get_workouts"
  | "get_sessions";

type RangeToolConfig = {
  name: RangeToolName;
  description: string;
  schema: z.ZodObject<{
    start_date: z.ZodOptional<z.ZodString>;
    end_date: z.ZodOptional<z.ZodString>;
  }>;
  endpoint: string;
  mapRange?: (range: { start: string; end: string }) => Params;
};

export type ToolDef<TSchema extends ToolSchema = ToolSchema> = {
  name: string;
  description: string;
  schema: TSchema;
  handler: (args: z.infer<TSchema>) => Promise<unknown>;
};

function toInputSchema(schema: ToolSchema): JsonSchema {
  return z.toJSONSchema(schema) as JsonSchema;
}

function createTool<TSchema extends ToolSchema>(config: {
  name: string;
  description: string;
  schema: TSchema;
  handler: (args: z.infer<TSchema>) => Promise<unknown>;
}): ToolDef<TSchema> {
  return config;
}

function createCollectionTool<TSchema extends ToolSchema>(config: {
  name: string;
  description: string;
  schema: TSchema;
  endpoint: string;
  mapParams: (args: z.infer<TSchema>) => Params;
}): ToolDef<TSchema> {
  return createTool({
    name: config.name,
    description: config.description,
    schema: config.schema,
    handler: async (rawArgs) => {
      const args = config.schema.parse(rawArgs);
      return fetchAllPages(config.endpoint, config.mapParams(args));
    },
  });
}

function resolveRangeParams(
  args: DateRangeArgs,
  mapRange?: (range: { start: string; end: string }) => Params
): Params {
  const range = validateDateRange(args.start_date, args.end_date);
  if (range instanceof Error) {
    throw range;
  }

  return mapRange ? mapRange(range) : { start_date: range.start, end_date: range.end };
}

function createRangeCollectionTool(config: RangeToolConfig): ToolDef<RangeToolConfig["schema"]> {
  return createCollectionTool({
    name: config.name,
    description: config.description,
    schema: config.schema,
    endpoint: config.endpoint,
    mapParams: (args) => resolveRangeParams(args, config.mapRange),
  });
}

const rangeToolConfigs: RangeToolConfig[] = [
  {
    name: "get_sleep_data",
    description: "Get sleep data including duration, quality, sleep stages, and sleep score.",
    schema: GetSleepDataSchema,
    endpoint: "/usercollection/daily_sleep",
  },
  {
    name: "get_activity_data",
    description: "Get daily activity metrics including steps, calories, active time, and activity score.",
    schema: GetActivityDataSchema,
    endpoint: "/usercollection/daily_activity",
  },
  {
    name: "get_readiness_data",
    description: "Get readiness score and contributors for the specified date range.",
    schema: GetReadinessDataSchema,
    endpoint: "/usercollection/daily_readiness",
  },
  {
    name: "get_heart_rate",
    description: "Get heart rate data including resting heart rate and heart rate variability.",
    schema: GetHeartRateSchema,
    endpoint: "/usercollection/heartrate",
    mapRange: (range) => ({
      start_datetime: `${range.start}T00:00:00Z`,
      end_datetime: `${range.end}T23:59:59Z`,
    }),
  },
  {
    name: "get_workouts",
    description: "Get workout records including activity type, duration, intensity, and heart rate data.",
    schema: GetWorkoutsSchema,
    endpoint: "/usercollection/workout",
  },
  {
    name: "get_sessions",
    description: "Get tagged sessions such as meditation, nap, or other logged activities.",
    schema: GetSessionsSchema,
    endpoint: "/usercollection/session",
  },
];

const rangeTools = rangeToolConfigs.map(createRangeCollectionTool);

const singleDateTools: ToolDef[] = [
  createCollectionTool({
    name: "get_daily_sleep",
    description: "Get sleep summary for a specific day including bedtime, sleep phases, and sleep efficiency.",
    schema: GetDailySleepSchema,
    endpoint: "/usercollection/daily_sleep",
    mapParams: (args) => {
      const date = validateDate(args.date, "date");
      if (date instanceof Error) {
        throw date;
      }

      return { start_date: date, end_date: date };
    },
  }),
];

const utilityTools: ToolDef[] = [
  createTool({
    name: "get_profile",
    description: "Get personal info for the current user to verify token and show profile data.",
    schema: GetProfileSchema,
    handler: async () => ouraRequest("/usercollection/personal_info", {}),
  }),
  createTool({
    name: "ping",
    description: "Simple health check for the MCP server without calling the Oura API.",
    schema: PingSchema,
    handler: async () => ({ status: "ok", timestamp: new Date().toISOString() }),
  }),
];

export const tools: ToolDef[] = [...rangeTools, ...singleDateTools, ...utilityTools];

const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

export function findTool(name: string): ToolDef | undefined {
  return toolMap.get(name);
}

export function toMcpToolList() {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toInputSchema(tool.schema),
  }));
}
