# Example Codex MCP Configuration

Add this to your Codex MCP settings to use the Oura MCP server:

```json
{
  "mcpServers": {
    "oura": {
      "command": "node",
      "args": ["/path/to/oura-mcp/dist/index.js"],
      "env": {
        "OURA_ACCESS_TOKEN": "your_oura_access_token_here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## How to get your Oura Access Token

1. Go to https://cloud.ouraring.com/personal-access-tokens
2. Click "Create a new Personal Access Token"
3. Give it a name (e.g., "Codex MCP")
4. Copy the generated token
5. Replace `your_oura_access_token_here` with your token

## Available Tools

- get_sleep_data
- get_activity_data
- get_readiness_data
- get_heart_rate
- get_workouts
- get_daily_sleep
- get_sessions
- get_profile
- ping

Notes:
- Pagination is automatic via `next_token` for Oura v2 collection endpoints.
- Errors will include Oura error `code`, `message`, and `x-request-id` when available.
