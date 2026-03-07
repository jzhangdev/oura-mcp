# Oura MCP 项目改进记录

> 最后更新：2026-03-07

---

## ✅ 已完成的改进（v1.3.0）

### 1) 代码结构模块化
- 将工具定义与处理逻辑拆分到 `src/tools/registry.ts`
- 将工具输入 Schema 抽取到 `src/schemas/tools.ts`
- `src/index.ts` 仅负责 MCP 服务器装配与启动

### 2) 分页支持（next_token）
- 新增 `src/api/pagination.ts`，实现 `fetchAllPages(endpoint, params)`
- 所有集合类端点统一跟随 `next_token` 并合并返回的 `data` 数组
- 已集成到：`daily_sleep`、`daily_activity`、`daily_readiness`、`session`、`workout`、`heartrate`

### 3) 健康与验证类工具
- 新增 `get_profile`：请求 `/usercollection/personal_info`，用于校验 Token 并返回用户信息
- 新增 `ping`：本地健康检查，无需外部请求

### 4) 错误处理改进
- 解析 Oura 错误 JSON，提取 `code`、`message`、`details`
- 尝试从响应头包含 `x-request-id`（或 `request-id`）并回显，便于排障
- 保留原有 429 限流与退避重试逻辑

### 5) 启动时校验
- 缺失 `OURA_ACCESS_TOKEN` 将立即退出并提示
- Node.js 版本检查（>= 18）确保内置 `fetch` 可用

### 6) 文档改进
- README 增加工具用法示例、分页与错误处理说明、环境变量与 Codex MCP 配置示例
- 记录了日志等级 `LOG_LEVEL`

### 7) 脚本与版本
- 版本号升级为 `1.3.0`
- 新增脚本：`typecheck`、`test`、`format`（Prettier）、`lint` 占位、`prepack` 自动构建

### 8) 日期校验强化
- 严格校验 `YYYY-MM-DD` 是否为真实日历日期，避免 `new Date(...)` 自动归一化导致的误判
- 使用 UTC 计算默认日期范围，避免时区边界带来的偏差

### 9) 自动化测试
- 新增 Node 原生测试套件，覆盖运行时配置校验、日期边界、分页合并与 Oura 错误解析
- 移除 API 客户端的导入时环境校验副作用，便于测试并降低模块耦合

### 10) CI
- 新增 GitHub Actions，在 `push` / `pull_request` 时自动执行 `typecheck`、`test`、`build`

---

## 📊 效果

- 对长时间范围查询稳定返回完整数据（自动分页）
- 出错时能看到明确的错误码与请求 ID，便于联系 Oura 支持或自查
- 结构更清晰、易于扩展新工具

---

## 🔜 后续建议

- README 增补响应示例与 FAQ
- 更健壮的 Zod -> JSON Schema 映射或直接依赖 @mcp/sdk 的 zod-to-json-schema 工具（若提供）

---

## 目录结构（当前）

```
src/
├── api/
│   ├── ouraClient.ts
│   └── pagination.ts
├── schemas/
│   └── tools.ts
├── tools/
│   └── registry.ts
├── utils/
│   ├── date.ts
│   ├── logger.ts
│   └── retry.ts
└── index.ts
```
