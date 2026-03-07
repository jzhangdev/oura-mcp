import type { z } from "zod";
import { 
  GetSleepDataSchema,
  GetActivityDataSchema,
  GetReadinessDataSchema,
  GetHeartRateSchema,
  GetWorkoutsSchema,
  GetDailySleepSchema,
  GetSessionsSchema,
  GetProfileSchema,
  PingSchema,
} from "../schemas/tools.js";
import { validateDate, validateDateRange } from "../utils/date.js";
import { ouraRequest } from "../api/ouraClient.js";
import { fetchAllPages } from "../api/pagination.js";

export type ToolDef = {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  // Implement the business logic for each tool
  handler: (args: any) => Promise<any>;
};

export const tools: ToolDef[] = [
  {
    name: "get_sleep_data",
    description:
      "Get sleep data including duration, quality, sleep stages, and sleep score. Returns detailed sleep metrics for the specified date range.",
    schema: GetSleepDataSchema,
    handler: async (args) => {
      const params = GetSleepDataSchema.parse(args);
      const dateRange = validateDateRange(params.start_date, params.end_date);
      if (dateRange instanceof Error) throw dateRange;
      const res = await fetchAllPages("/usercollection/daily_sleep", {
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      return res;
    },
  },
  {
    name: "get_activity_data",
    description:
      "Get daily activity metrics including steps, calories, active time, and activity score.",
    schema: GetActivityDataSchema,
    handler: async (args) => {
      const params = GetActivityDataSchema.parse(args);
      const dateRange = validateDateRange(params.start_date, params.end_date);
      if (dateRange instanceof Error) throw dateRange;
      const res = await fetchAllPages("/usercollection/daily_activity", {
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      return res;
    },
  },
  {
    name: "get_readiness_data",
    description:
      "Get readiness score and contributors (sleep, activity, recovery). The readiness score indicates how prepared your body is for the day.",
    schema: GetReadinessDataSchema,
    handler: async (args) => {
      const params = GetReadinessDataSchema.parse(args);
      const dateRange = validateDateRange(params.start_date, params.end_date);
      if (dateRange instanceof Error) throw dateRange;
      const res = await fetchAllPages("/usercollection/daily_readiness", {
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      return res;
    },
  },
  {
    name: "get_heart_rate",
    description:
      "Get heart rate data including resting heart rate and heart rate variability.",
    schema: GetHeartRateSchema,
    handler: async (args) => {
      const params = GetHeartRateSchema.parse(args);
      const dateRange = validateDateRange(params.start_date, params.end_date);
      if (dateRange instanceof Error) throw dateRange;
      const res = await fetchAllPages("/usercollection/heartrate", {
        start_datetime: `${dateRange.start}T00:00:00Z`,
        end_datetime: `${dateRange.end}T23:59:59Z`,
      });
      return res;
    },
  },
  {
    name: "get_workouts",
    description:
      "Get workout records including activity type, duration, intensity, and heart rate data.",
    schema: GetWorkoutsSchema,
    handler: async (args) => {
      const params = GetWorkoutsSchema.parse(args);
      const dateRange = validateDateRange(params.start_date, params.end_date);
      if (dateRange instanceof Error) throw dateRange;
      const res = await fetchAllPages("/usercollection/workout", {
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      return res;
    },
  },
  {
    name: "get_daily_sleep",
    description:
      "Get sleep summary for a specific day including bedtime, sleep phases, and sleep efficiency.",
    schema: GetDailySleepSchema,
    handler: async (args) => {
      const params = GetDailySleepSchema.parse(args);
      const dateValidation = validateDate(params.date, "date");
      if (dateValidation instanceof Error) throw dateValidation;
      const res = await fetchAllPages("/usercollection/daily_sleep", {
        start_date: params.date,
        end_date: params.date,
      });
      return res;
    },
  },
  {
    name: "get_sessions",
    description:
      "Get tagged sessions such as meditation, nap, or other activities you've logged.",
    schema: GetSessionsSchema,
    handler: async (args) => {
      const params = GetSessionsSchema.parse(args);
      const dateRange = validateDateRange(params.start_date, params.end_date);
      if (dateRange instanceof Error) throw dateRange;
      const res = await fetchAllPages("/usercollection/session", {
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      return res;
    },
  },
  {
    name: "get_profile",
    description: "Get profile/personal info for the current user to verify token and show user info.",
    schema: GetProfileSchema,
    handler: async () => {
      const res = await ouraRequest("/usercollection/personal_info", {});
      return res;
    },
  },
  {
    name: "ping",
    description: "Simple health check for the MCP server (no Oura API call).",
    schema: PingSchema,
    handler: async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    },
  },
];

export function toMcpToolList() {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.schema),
  }));
}

// Minimal Zod -> JSON Schema converter for our simple argument objects
function zodToJsonSchema(schema: any): any {
  try {
    const shape = (schema as any).shape;
    const properties: Record<string, any> = {};
    for (const key of Object.keys(shape || {})) {
      const field = shape[key];
      const desc = field?.description ?? field?._def?.description;
      properties[key] = { type: 'string', description: desc };
    }
    return { type: 'object', properties };
  } catch {
    return { type: 'object', properties: {} };
  }
}
