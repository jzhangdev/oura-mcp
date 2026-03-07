import { z } from "zod";

const DATE_FIELD_DESCRIPTION = "Date in YYYY-MM-DD format";

export const OptionalDateSchema = z.string().optional().describe(DATE_FIELD_DESCRIPTION);
export const RequiredDateSchema = z.string().describe(DATE_FIELD_DESCRIPTION);

function createDateRangeSchema() {
  return z.object({
    start_date: OptionalDateSchema,
    end_date: OptionalDateSchema,
  });
}

export const GetSleepDataSchema = createDateRangeSchema();
export const GetActivityDataSchema = createDateRangeSchema();
export const GetReadinessDataSchema = createDateRangeSchema();
export const GetHeartRateSchema = createDateRangeSchema();
export const GetWorkoutsSchema = createDateRangeSchema();
export const GetSessionsSchema = createDateRangeSchema();

export const GetDailySleepSchema = z.object({
  date: RequiredDateSchema,
});

export const GetProfileSchema = z.object({});
export const PingSchema = z.object({});

export const toolSchemas = {
  get_sleep_data: GetSleepDataSchema,
  get_activity_data: GetActivityDataSchema,
  get_readiness_data: GetReadinessDataSchema,
  get_heart_rate: GetHeartRateSchema,
  get_workouts: GetWorkoutsSchema,
  get_daily_sleep: GetDailySleepSchema,
  get_sessions: GetSessionsSchema,
  get_profile: GetProfileSchema,
  ping: PingSchema,
} as const;

export type ToolArgSchemas = typeof toolSchemas;
