import assert from "node:assert/strict";
import test from "node:test";

import {
  RuntimeValidationError,
  parseRuntimeConfig,
  validateStartupRuntime,
} from "../src/utils/runtime.ts";

test("parseRuntimeConfig returns the configured Oura token", () => {
  const config = parseRuntimeConfig({ OURA_ACCESS_TOKEN: "test-token" }, "20.11.1");

  assert.deepEqual(config, {
    ouraAccessToken: "test-token",
  });
});

test("parseRuntimeConfig rejects missing tokens", () => {
  assert.throws(() => parseRuntimeConfig({}, "20.11.1"), {
    name: "RuntimeValidationError",
    message: "Missing OURA_ACCESS_TOKEN. Set it in environment or .env file.",
  });
});

test("validateStartupRuntime allows startup without an Oura token", () => {
  assert.doesNotThrow(() => validateStartupRuntime("20.11.1"));
});

test("parseRuntimeConfig rejects unsupported Node.js versions", () => {
  assert.throws(() => parseRuntimeConfig({ OURA_ACCESS_TOKEN: "test-token" }, "16.20.2"), {
    name: "RuntimeValidationError",
    message: "Node.js >= 18 is required. Current: v16.20.2",
  });
});

test("validateStartupRuntime rejects unsupported Node.js versions", () => {
  assert.throws(() => validateStartupRuntime("16.20.2"), {
    name: "RuntimeValidationError",
    message: "Node.js >= 18 is required. Current: v16.20.2",
  });
});

test("RuntimeValidationError is an Error subclass", () => {
  const error = new RuntimeValidationError("broken runtime");

  assert.ok(error instanceof Error);
  assert.equal(error.name, "RuntimeValidationError");
});
