import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalStderrWrite = process.stderr.write.bind(process.stderr);
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

function restore(): void {
  process.stderr.write = originalStderrWrite;
  process.stdout.write = originalStdoutWrite;
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  console.debug = originalConsoleDebug;
  delete process.env.MCP_STDIO_MODE;
  delete process.env.LOG_STDOUT;
  delete process.env.NO_COLOR;
  delete process.env.FORCE_COLOR;
}

afterEach(() => {
  restore();
});

test("redirectConsoleToStderrForMcp reroutes console output away from stdout", async () => {
  process.env.MCP_STDIO_MODE = "1";
  process.env.LOG_STDOUT = "1";

  const stderrChunks: string[] = [];
  const stdoutChunks: string[] = [];

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderrChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdoutChunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  const mod = await import(`../src/utils/logger.ts?logger=${Date.now()}`);
  mod.redirectConsoleToStderrForMcp();

  console.log("hello", { ok: true });
  console.error(new Error("boom"));

  assert.equal(stdoutChunks.length, 0);
  assert.equal(stderrChunks.length, 2);
  assert.match(stderrChunks[0], /\[console\.log\] hello/);
  assert.match(stderrChunks[0], /"ok": true/);
  assert.match(stderrChunks[1], /\[console\.error\]/);
  assert.match(stderrChunks[1], /Error: boom/);
  assert.doesNotMatch(stderrChunks[0], /\x1b\[/);
});
