import { createLogger } from "../utils/logger.js";
import { validateRuntime } from "../utils/runtime.js";
import {
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
  RateLimitError,
  calculateBackoff,
  sleep,
} from "../utils/retry.js";

const logger = createLogger("oura-client");
const OURA_API_BASE = "https://api.ouraring.com/v2";

type OuraErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  code?: string;
  message?: string;
  details?: unknown;
};

type OuraResponse = {
  ok: boolean;
  status: number;
  headers: Headers;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

function buildErrorMessage(response: OuraResponse, rawBody: string): string {
  const requestId = response.headers.get("x-request-id") || response.headers.get("request-id");

  let payload: OuraErrorPayload | undefined;
  try {
    payload = JSON.parse(rawBody) as OuraErrorPayload;
  } catch {
    payload = undefined;
  }

  const code = payload?.error?.code ?? payload?.code;
  const message = payload?.error?.message ?? payload?.message;
  const details = payload?.error?.details ?? payload?.details;

  return [
    `Oura API error: ${response.status}${message ? ` - ${message}` : ""}`,
    code ? `code=${code}` : undefined,
    requestId ? `request_id=${requestId}` : undefined,
    details ? `details=${JSON.stringify(details)}` : undefined,
    message ? undefined : rawBody,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" | ");
}

export async function ouraRequest(
  endpoint: string,
  params?: Record<string, string>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<unknown> {
  const { ouraAccessToken } = validateRuntime();
  const url = new URL(`${OURA_API_BASE}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.append(key, value);
      }
    }
  }

  logger.debug(`Making request to ${endpoint}`, { params });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt += 1) {
    try {
      const response = (await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${ouraAccessToken}`,
        },
      })) as OuraResponse;

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : 60;

        logger.warn(`Rate limited. Waiting ${retryAfter} seconds...`);

        if (attempt < retryConfig.maxRetries) {
          await sleep(retryAfter * 1000);
          continue;
        }

        throw new RateLimitError(retryAfter);
      }

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status >= 500 && attempt < retryConfig.maxRetries) {
          const delay = calculateBackoff(attempt, retryConfig);
          logger.warn(
            `Server error ${response.status}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retryConfig.maxRetries})`
          );
          await sleep(delay);
          continue;
        }

        throw new Error(buildErrorMessage(response, errorText));
      }

      const data = await response.json();
      logger.info(`Successfully fetched data from ${endpoint}`);
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof TypeError && attempt < retryConfig.maxRetries) {
        const delay = calculateBackoff(attempt, retryConfig);
        logger.warn(
          `Network error. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retryConfig.maxRetries})`
        );
        await sleep(delay);
        continue;
      }

      if (error instanceof RateLimitError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes("Oura API error")) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Max retries exceeded");
}
