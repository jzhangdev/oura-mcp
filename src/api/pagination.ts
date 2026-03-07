import { ouraRequest } from "./ouraClient.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("oura-pagination");

type PaginationResponse = {
  data?: unknown[];
  next_token?: string;
  nextToken?: string;
};

type MergedPaginationResponse = {
  data: unknown[];
};

export async function fetchAllPages(
  endpoint: string,
  params: Record<string, string | undefined>
): Promise<unknown> {
  let nextToken: string | undefined;
  const merged: MergedPaginationResponse = { data: [] };

  do {
    const pageParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        pageParams[key] = value;
      }
    }

    if (nextToken) {
      pageParams.next_token = nextToken;
    }

    const response = await ouraRequest(endpoint, pageParams);

    if (Array.isArray(response)) {
      merged.data.push(...response);
      nextToken = undefined;
      continue;
    }

    if (response && typeof response === "object") {
      const page = response as PaginationResponse;
      if (Array.isArray(page.data)) {
        merged.data.push(...page.data);
        nextToken = page.next_token ?? page.nextToken;
        continue;
      }
    }

    logger.warn("Unexpected pagination payload shape", { endpoint, sample: response });
    return response;
  } while (nextToken);

  return merged;
}
