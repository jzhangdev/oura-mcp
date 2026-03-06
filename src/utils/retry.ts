/**
 * 重试机制和错误处理
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;  // milliseconds
  maxDelay: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function calculateBackoff(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  );
  // 添加随机抖动避免请求风暴
  return delay + Math.random() * 1000;
}

export class RateLimitError extends Error {
  public readonly retryAfter: number;
  
  constructor(retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}
