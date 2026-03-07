import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultEndDate,
  getDefaultStartDate,
  validateDate,
  validateDateRange,
} from "../src/utils/date.ts";

const FIXED_NOW = new Date("2026-03-07T12:00:00Z");

test("validateDate rejects impossible calendar dates", () => {
  const result = validateDate("2024-02-31", "date", FIXED_NOW);

  assert.ok(result instanceof Error);
  assert.equal(result.message, "Invalid date: Invalid calendar date");
});

test("validateDate accepts valid leap-day dates", () => {
  const result = validateDate("2024-02-29", "date", FIXED_NOW);

  assert.equal(result, "2024-02-29");
});

test("validateDate rejects future dates relative to the current clock", () => {
  const result = validateDate("2026-03-08", "date", FIXED_NOW);

  assert.ok(result instanceof Error);
  assert.equal(result.message, "Invalid date: Date cannot be in the future");
});

test("validateDateRange uses deterministic default bounds", () => {
  const result = validateDateRange(undefined, undefined, FIXED_NOW);

  assert.deepEqual(result, {
    start: "2026-02-28",
    end: "2026-03-07",
  });
});

test("validateDateRange rejects reversed ranges", () => {
  const result = validateDateRange("2026-03-07", "2026-03-01", FIXED_NOW);

  assert.ok(result instanceof Error);
  assert.equal(result.message, "start_date cannot be after end_date");
});

test("default date helpers stay UTC-safe", () => {
  assert.equal(getDefaultStartDate(FIXED_NOW), "2026-02-28");
  assert.equal(getDefaultEndDate(FIXED_NOW), "2026-03-07");
});
