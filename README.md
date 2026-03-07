# Oura MCP Server

MCP (Model Context Protocol) server for Oura Ring API integration.

## Features

- Modular tool registry (src/tools) and input schemas (src/schemas)
- Robust pagination for Oura v2 collection endpoints (next_token)
- Retry with exponential backoff and jitter; rate limit handling (429)
- Improved error messages with Oura error code and request id
- Startup validation for OURA_ACCESS_TOKEN and Node.js >= 18
- Logging with levels via LOG_LEVEL env (error|warn|info|debug)

## Tools

- get_sleep_data: Get sleep metrics (duration, quality, stages)
- get_activity_data: Get daily activity metrics
- get_readiness_data: Get readiness score and contributors
- get_heart_rate: Get heart rate data
- get_workouts: Get workout records
- get_daily_sleep: Get sleep summary for a specific day
- get_sessions: Get tagged sessions (meditation, nap, etc.)
- get_profile: Fetch personal info to verify token
- ping: Simple health check

## Setup

1) Get Oura API Token
- https://cloud.ouraring.com/personal-access-tokens
- Create a new Personal Access Token and copy it

2) Configure Environment

```bash
cp .env.example .env
# Edit .env and add your token
# Required
OURA_ACCESS_TOKEN=your_token_here
# Optional
LOG_LEVEL=info # error|warn|info|debug
```

3) Install Dependencies

```bash
npm install
```

4) Build & Run

```bash
npm run build
npm start
```

Node.js 18+ is required (for global `fetch`).

## Usage with Codex

Add to your Codex MCP configuration:

```json
{
  "mcpServers": {
    "oura": {
      "command": "node",
      "args": ["/path/to/oura-mcp/dist/index.js"],
      "env": {
        "OURA_ACCESS_TOKEN": "your_token",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## API Reference and Examples

All date parameters use YYYY-MM-DD. If omitted, start_date defaults to 7 days ago and end_date to today.

- get_sleep_data
  - Params: start_date?, end_date?
  - Example: { "name": "get_sleep_data", "arguments": { "start_date": "2026-03-01", "end_date": "2026-03-07" } }

- get_activity_data
  - Params: start_date?, end_date?
  - Example: { "name": "get_activity_data", "arguments": {} }

- get_readiness_data
  - Params: start_date?, end_date?
  - Example: { "name": "get_readiness_data", "arguments": { "start_date": "2026-02-20" } }

- get_heart_rate
  - Params: start_date?, end_date?
  - Example: { "name": "get_heart_rate", "arguments": { "start_date": "2026-03-05", "end_date": "2026-03-06" } }

- get_workouts
  - Params: start_date?, end_date?
  - Example: { "name": "get_workouts", "arguments": { "start_date": "2026-01-01", "end_date": "2026-03-01" } }

- get_daily_sleep
  - Params: date
  - Example: { "name": "get_daily_sleep", "arguments": { "date": "2026-03-06" } }

- get_sessions
  - Params: start_date?, end_date?
  - Example: { "name": "get_sessions", "arguments": { "start_date": "2026-03-01", "end_date": "2026-03-07" } }

- get_profile
  - Params: none
  - Example: { "name": "get_profile" }

- ping
  - Params: none
  - Example: { "name": "ping" }

### Pagination
This server automatically follows `next_token` for Oura v2 collection endpoints and merges all `data` arrays before returning.

### Error Handling
- Parses Oura error JSON and surfaces `code`, `message`, and includes the `x-request-id` header when available.
- Handles 429 (rate limited) with automatic waits and clear user messages.
- Retries transient network and 5xx errors with exponential backoff and jitter.

## Development

Scripts:
- build: TypeScript build to dist/
- typecheck: ts type checking only
- format: Prettier format (optional)
- lint: Placeholder
- dev: tsx watch runner for local development

Project structure:
```
src/
├── api/
│   ├── ouraClient.ts       # Oura HTTP client + enhanced error parsing
│   └── pagination.ts       # fetchAllPages helper (follows next_token)
├── tools/
│   └── registry.ts         # Tool registry (definitions + handlers)
├── schemas/
│   └── tools.ts            # Zod schemas for tool arguments
├── utils/
│   ├── date.ts             # date validation and defaults
│   ├── logger.ts           # logging utility; LOG_LEVEL controls verbosity
│   └── retry.ts            # retry, backoff, RateLimitError
└── index.ts                # MCP server wiring
```

## Oura API Documentation

https://cloud.ouraring.com/docs/

## License

MIT
