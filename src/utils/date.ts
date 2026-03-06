/**
 * 日期验证和处理工具
 */

import { z } from "zod";

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

export function validateDate(date: string | undefined, fieldName: string): string | Error {
  if (!date) return date as undefined as any;
  
  const result = DateValidationSchema.safeParse(date);
  if (!result.success) {
    return new Error(`Invalid ${fieldName}: ${result.error.issues[0].message}`);
  }
  return date;
}

export function validateDateRange(
  startDate: string | undefined, 
  endDate: string | undefined
): { start: string; end: string } | Error {
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

export function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
}

export function getDefaultEndDate(): string {
  return new Date().toISOString().split("T")[0];
}
