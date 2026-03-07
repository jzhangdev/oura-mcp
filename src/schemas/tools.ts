import { z } from "zod";

export const GetSleepDataSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

export const GetActivityDataSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

export const GetReadinessDataSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

export const GetHeartRateSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

export const GetWorkoutsSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

export const GetDailySleepSchema = z.object({
  date: z.string().describe("Date (YYYY-MM-DD)"),
});

export const GetSessionsSchema = z.object({
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

export const GetProfileSchema = z.object({});
export const PingSchema = z.object({});

export type ToolArgSchemas = {
  get_sleep_data: typeof GetSleepDataSchema;
  get_activity_data: typeof GetActivityDataSchema;
  get_readiness_data: typeof GetReadinessDataSchema;
  get_heart_rate: typeof GetHeartRateSchema;
  get_workouts: typeof GetWorkoutsSchema;
  get_daily_sleep: typeof GetDailySleepSchema;
  get_sessions: typeof GetSessionsSchema;
  get_profile: typeof GetProfileSchema;
  ping: typeof PingSchema;
};
