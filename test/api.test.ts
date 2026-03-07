import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { ouraRequest } from "../src/api/ouraClient.ts";
import { fetchAllPages } from "../src/api/pagination.ts";

const originalFetch = globalThis.fetch;
const originalToken = process.env.OURA_ACCESS_TOKEN;

type MockResponseInit = {
  headers?: Record<string, string>;
  status?: number;
};

function createResponse(body: unknown, init: MockResponseInit = {}): Response {
  const status = init.status ?? 200;

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(init.headers),
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  } as Response;
}

function installFetchMock(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>
): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    return handler(url, init);
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalToken) {
    process.env.OURA_ACCESS_TOKEN = originalToken;
  } else {
    delete process.env.OURA_ACCESS_TOKEN;
  }
});

test("ouraRequest includes structured Oura error details", async () => {
  process.env.OURA_ACCESS_TOKEN = "test-token";

  installFetchMock(() =>
    createResponse(
      {
        error: {
          code: "invalid_token",
          message: "Unauthorized",
          details: { scope: "personal_info" },
        },
      },
      {
        status: 401,
        headers: { "x-request-id": "req-123" },
      }
    )
  );

  await assert.rejects(
    () => ouraRequest("/usercollection/personal_info"),
    /Oura API error: 401 - Unauthorized \| code=invalid_token \| request_id=req-123 \| details=\{"scope":"personal_info"\}/
  );
});

test("fetchAllPages merges all paginated data into one response", async () => {
  process.env.OURA_ACCESS_TOKEN = "test-token";
  const calls: string[] = [];

  installFetchMock((url) => {
    calls.push(url);

    if (calls.length === 1) {
      return createResponse({
        data: [{ id: "page-1" }],
        next_token: "cursor-2",
      });
    }

    return createResponse({
      data: [{ id: "page-2" }],
    });
  });

  const result = await fetchAllPages("/usercollection/daily_sleep", {
    start_date: "2026-03-01",
    end_date: "2026-03-07",
  });

  assert.deepEqual(result, {
    data: [{ id: "page-1" }, { id: "page-2" }],
  });
  assert.equal(calls.length, 2);
  assert.match(calls[0], /start_date=2026-03-01/);
  assert.match(calls[0], /end_date=2026-03-07/);
  assert.match(calls[1], /next_token=cursor-2/);
});

test("fetchAllPages returns unexpected payloads unchanged", async () => {
  process.env.OURA_ACCESS_TOKEN = "test-token";

  installFetchMock(() =>
    createResponse({
      items: [{ id: "raw-shape" }],
    })
  );

  const result = await fetchAllPages("/usercollection/daily_sleep", {
    start_date: "2026-03-01",
    end_date: "2026-03-07",
  });

  assert.deepEqual(result, {
    items: [{ id: "raw-shape" }],
  });
});
