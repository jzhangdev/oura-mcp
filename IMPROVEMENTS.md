# Oura MCP 项目改进建议

> 由 Codex (gpt-5.3-codex) 分析生成

---

## 🔴 高优先级

### 1. 缺少错误重试机制

**问题描述：**
当前 `ouraRequest` 函数在 API 请求失败时直接抛出错误，没有重试逻辑。

**影响范围：**
- 网络抖动导致请求失败
- API 临时不可用
- 用户体验差

**解决方案：**
添加指数退避重试机制。

**代码示例：**
```typescript
async function ouraRequestWithRetry(
  endpoint: string,
  params?: Record<string, string>,
  maxRetries = 3
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ouraRequest(endpoint, params);
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 指数退避
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

---

### 2. 缺少输入验证边界检查

**问题描述：**
日期参数没有验证是否在合理范围内，可能导致 API 返回错误。

**影响范围：**
- 用户输入未来日期
- 日期范围过大导致 API 超时
- 无效日期格式

**解决方案：**
添加日期验证和范围限制。

**代码示例：**
```typescript
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

function validateDateRange(startDate?: string, endDate?: string): void {
  const today = new Date().toISOString().split('T')[0];
  const maxRange = 365; // 最大查询范围一年
  
  if (startDate && startDate > today) {
    throw new Error("Start date cannot be in the future");
  }
  
  if (endDate && endDate > today) {
    throw new Error("End date cannot be in the future");
  }
  
  if (startDate && endDate) {
    const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
    if (diff > maxRange) {
      throw new Error(`Date range cannot exceed ${maxRange} days`);
    }
  }
}
```

---

### 3. 缺少速率限制处理

**问题描述：**
Oura API 有速率限制，当前代码没有处理 `429 Too Many Requests` 响应。

**影响范围：**
- 批量请求时被限流
- 用户无法获得数据
- 无友好错误提示

**解决方案：**
解析响应头中的速率限制信息并处理。

**代码示例：**
```typescript
async function ouraRequest(endpoint: string, params?: Record<string, string>): Promise<any> {
  const url = new URL(`${OURA_API_BASE}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${OURA_ACCESS_TOKEN}`,
    },
  });

  // 处理速率限制
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60';
    throw new Error(`Rate limited. Please retry after ${retryAfter} seconds`);
  }

  if (!response.ok) {
    throw new Error(`Oura API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
```

---

## 🟡 中优先级

### 4. 代码结构需要模块化

**问题描述：**
所有代码集中在 `src/index.ts` 单文件中（约 340 行），难以维护。

**影响范围：**
- 代码可读性差
- 难以测试
- 无法复用

**解决方案：**
拆分为多个模块。

**建议结构：**
```
src/
├── index.ts          # 入口和服务器配置
├── tools/
│   ├── sleep.ts      # 睡眠相关工具
│   ├── activity.ts   # 活动相关工具
│   ├── readiness.ts  # 准备度工具
│   ├── heart.ts      # 心率工具
│   └── workouts.ts   # 锻炼工具
├── api/
│   └── oura.ts       # Oura API 客户端
├── schemas/
│   └── index.ts      # Zod schemas
└── utils/
    └── date.ts       # 日期工具函数
```

---

### 5. 缺少日志系统

**问题描述：**
当前只有 `console.error` 输出错误，缺少结构化日志。

**影响范围：**
- 调试困难
- 无法追踪问题
- 生产环境监控困难

**解决方案：**
使用 pino 或 winston 日志库。

**代码示例：**
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// 使用示例
logger.info({ tool: 'get_sleep_data', params }, 'Tool called');
logger.error({ error: err.message }, 'API request failed');
```

---

### 6. 缺少类型定义导出

**问题描述：**
当前 `dist/index.d.ts` 只导出空对象，用户无法获得类型提示。

**影响范围：**
- IDE 无法提供类型提示
- 用户需要手动定义类型

**解决方案：**
导出所有公共类型。

**代码示例：**
```typescript
// src/types.ts
export interface SleepDataParams {
  start_date?: string;
  end_date?: string;
}

export interface SleepDataResponse {
  // ... Oura API 响应类型
}

// src/index.ts
export type { SleepDataParams, SleepDataResponse } from './types';
```

---

## 🟢 低优先级

### 7. 缺少单元测试

**问题描述：**
项目没有任何测试文件。

**解决方案：**
添加 Jest 或 Vitest 测试框架。

**代码示例：**
```typescript
// tests/oura.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('ouraRequest', () => {
  it('should handle rate limiting', async () => {
    // 测试代码
  });
});
```

---

### 8. 缺少 CI/CD 配置

**问题描述：**
项目没有持续集成配置。

**解决方案：**
添加 GitHub Actions 工作流。

**代码示例：**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm test
```

---

### 9. README 可以更详细

**问题描述：**
README 缺少 API 响应示例、常见问题解答。

**建议添加：**
- API 响应示例
- 错误代码说明
- 常见问题 FAQ
- 贡献指南
- 变更日志

---

### 10. 缺少配置文件验证

**问题描述：**
启动时只检查 `OURA_ACCESS_TOKEN`，没有验证 token 有效性。

**解决方案：**
添加启动时 token 验证。

**代码示例：**
```typescript
async function validateToken(): Promise<boolean> {
  try {
    await ouraRequest('/usercollection/daily_sleep', {
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
    });
    return true;
  } catch (error) {
    return false;
  }
}

// 启动时验证
if (!await validateToken()) {
  console.error("Error: Invalid OURA_ACCESS_TOKEN");
  process.exit(1);
}
```

---

## 📊 改进优先级总结

| 优先级 | 问题 | 预计工作量 |
|--------|------|-----------|
| 🔴 高 | 错误重试机制 | 1-2 小时 |
| 🔴 高 | 输入验证 | 1 小时 |
| 🔴 高 | 速率限制处理 | 1 小时 |
| 🟡 中 | 代码模块化 | 2-3 小时 |
| 🟡 中 | 日志系统 | 1 小时 |
| 🟡 中 | 类型导出 | 30 分钟 |
| 🟢 低 | 单元测试 | 3-4 小时 |
| 🟢 低 | CI/CD | 1 小时 |
| 🟢 低 | README 完善 | 30 分钟 |
| 🟢 低 | Token 验证 | 30 分钟 |

---

## 🚀 下一步建议

1. **立即处理**：高优先级问题（错误重试、输入验证、速率限制）
2. **短期计划**：代码模块化重构
3. **长期计划**：添加测试、CI/CD、完善文档
