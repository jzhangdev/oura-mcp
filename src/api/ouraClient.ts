/**
 * Oura API 客户端
 */

import { createLogger } from '../utils/logger.js';
import { 
  RetryConfig, 
  DEFAULT_RETRY_CONFIG, 
  sleep, 
  calculateBackoff, 
  RateLimitError 
} from '../utils/retry.js';

const logger = createLogger('oura-client');

const OURA_API_BASE = "https://api.ouraring.com/v2";
const OURA_ACCESS_TOKEN = process.env.OURA_ACCESS_TOKEN;

if (!OURA_ACCESS_TOKEN) {
  logger.error("OURA_ACCESS_TOKEN environment variable is required");
  process.exit(1);
}

export async function ouraRequest(
  endpoint: string, 
  params?: Record<string, string>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<any> {
  const url = new URL(`${OURA_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  logger.debug(`Making request to ${endpoint}`, { params });

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${OURA_ACCESS_TOKEN}`,
        },
      });

      // 处理速率限制 (429)
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfter = retryAfterHeader 
          ? parseInt(retryAfterHeader, 10) 
          : 60;
        
        logger.warn(`Rate limited. Waiting ${retryAfter} seconds...`);
        
        if (attempt < retryConfig.maxRetries) {
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new RateLimitError(retryAfter);
      }

      if (!response.ok) {
        const errorText = await response.text();
        
        // 5xx 服务器错误可重试
        if (response.status >= 500 && attempt < retryConfig.maxRetries) {
          const delay = calculateBackoff(attempt, retryConfig);
          logger.warn(`Server error ${response.status}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
          await sleep(delay);
          continue;
        }
        
        throw new Error(`Oura API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.info(`Successfully fetched data from ${endpoint}`);
      return data;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 网络错误可重试
      if (error instanceof TypeError && attempt < retryConfig.maxRetries) {
        const delay = calculateBackoff(attempt, retryConfig);
        logger.warn(`Network error. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      // RateLimitError 直接抛出
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // 其他错误直接抛出
      if (error instanceof Error && error.message.startsWith('Oura API error')) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}
