# Oura MCP Server

MCP (Model Context Protocol) server for Oura Ring API integration.

## Features

- Modular tool registry and typed handlers
- Proper JSON Schema generation from Zod using `zod-to-json-schema`
- Robust pagination for Oura v2 collection endpoints (`next_token`)
- Retry with exponential backoff and jitter, including rate-limit handling (429)
- Improved error messages with Oura error code and request id
- Startup validation for `OURA_ACCESS_TOKEN` and Node.js >= 18
- Strict ISO date validation that rejects impossible calendar dates
- Automated tests for runtime validation, pagination, and API error handling
- GitHub Actions CI for typecheck, test, and build
- Logging with levels via `LOG_LEVEL` env (`error|warn|info|debug`)

## Tools

- `get_sleep_data`: Get sleep metrics
- `get_activity_data`: Get daily activity metrics
- `get_readiness_data`: Get readiness score and contributors
- `get_heart_rate`: Get heart rate data
- `get_workouts`: Get workout records
- `get_daily_sleep`: Get sleep summary for a specific day
- `get_sessions`: Get tagged sessions
- `get_profile`: Fetch personal info to verify token
- `ping`: Simple health check

## Setup

1. Get an Oura personal access token:
   - <https://cloud.ouraring.com/personal-access-tokens>
2. Configure environment:

```bash
cp .env.example .env
# Required
OURA_ACCESS_TOKEN=your_token_here
# Optional
LOG_LEVEL=info
```

3. Install dependencies:

```bash
pnpm install
```

4. Build and run:

```bash
pnpm run build
pnpm start
```

## Usage with Codex

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

## Development

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

Project structure:

```text
src/
├── api/
├── schemas/
├── tools/
├── utils/
└── index.ts
```

## Oura API Documentation

<https://cloud.ouraring.com/docs/>
