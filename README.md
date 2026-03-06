# Oura MCP Server

MCP (Model Context Protocol) server for Oura Ring API integration.

## Features

Provides MCP tools to access Oura Ring data:

- `get_sleep_data` - Get sleep metrics (duration, quality, stages)
- `get_activity_data` - Get daily activity metrics
- `get_readiness_data` - Get readiness score and contributors
- `get_heart_rate` - Get heart rate data
- `get_workouts` - Get workout records
- `get_daily_sleep` - Get sleep summary for a specific day
- `get_sessions` - Get tagged sessions (meditation, nap, etc.)

## Setup

### 1. Get Oura API Token

1. Visit https://cloud.ouraring.com/personal-access-tokens
2. Create a new Personal Access Token
3. Copy the token

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your token
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Build & Run

```bash
npm run build
npm start
```

## Usage with Codex

Add to your Codex MCP configuration:

```json
{
  "mcpServers": {
    "oura": {
      "command": "node",
      "args": ["/path/to/oura-mcp/dist/index.js"],
      "env": {
        "OURA_ACCESS_TOKEN": "your_token"
      }
    }
  }
}
```

## API Reference

### get_sleep_data
Get sleep data for a date range.

Parameters:
- `start_date` (optional): Start date (YYYY-MM-DD), defaults to 7 days ago
- `end_date` (optional): End date (YYYY-MM-DD), defaults to today

### get_activity_data
Get daily activity metrics.

Parameters:
- `start_date` (optional): Start date
- `end_date` (optional): End date

### get_readiness_data
Get readiness scores.

Parameters:
- `start_date` (optional): Start date
- `end_date` (optional): End date

### get_heart_rate
Get heart rate data.

Parameters:
- `start_date` (optional): Start date
- `end_date` (optional): End date

### get_workouts
Get workout records.

Parameters:
- `start_date` (optional): Start date
- `end_date` (optional): End date

## Oura API Documentation

https://cloud.ouraring.com/docs/

## License

MIT
