import { ouraRequest } from './ouraClient.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('oura-pagination');

// For Oura v2 collection endpoints returning { data: [...], next_token?: string }
export async function fetchAllPages(endpoint: string, params: Record<string, string | undefined>): Promise<any> {
  let nextToken: string | undefined = undefined;
  const merged: any = { data: [] as any[] };

  do {
    const pageParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params || {})) {
      if (v) pageParams[k] = v;
    }
    if (nextToken) pageParams["next_token"] = nextToken;

    const res = await ouraRequest(endpoint, pageParams);

    if (Array.isArray(res)) {
      // Some endpoints could theoretically return arrays directly
      merged.data.push(...res);
    } else if (res && Array.isArray(res.data)) {
      merged.data.push(...res.data);
    } else {
      // Unknown shape; just return raw
      logger.warn('Unexpected pagination payload shape', { endpoint, sample: res });
      return res;
    }

    nextToken = res?.next_token || res?.nextToken;
  } while (nextToken);

  return merged;
}
