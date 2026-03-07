import test from 'node:test';
import assert from 'node:assert/strict';

import { toMcpToolList } from '../src/tools/registry.js';

test('tool schemas include object properties for Claude tool discovery', () => {
  const tools = toMcpToolList();
  const dailySleep = tools.find((tool) => tool.name === 'get_daily_sleep');
  assert.ok(dailySleep);
  assert.equal(dailySleep.inputSchema.type, 'object');
  assert.ok(typeof dailySleep.inputSchema.properties === 'object');
  assert.ok('date' in (dailySleep.inputSchema.properties as Record<string, unknown>));

  const ping = tools.find((tool) => tool.name === 'ping');
  assert.ok(ping);
  assert.equal(ping.inputSchema.type, 'object');
});
