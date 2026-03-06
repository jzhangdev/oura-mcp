# Example Codex MCP Configuration

Add this to your Codex MCP settings to use the Oura MCP server:

```json
{
  "mcpServers": {
    "oura": {
      "command": "node",
      "args": ["/path/to/oura-mcp/dist/index.js"],
      "env": {
        "OURA_ACCESS_TOKEN": "your_oura_access_token_here"
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

Once configured, you can ask Codex to:

- "Get my sleep data from last week"
- "Show my readiness score for today"
- "How many steps did I take yesterday?"
- "What was my heart rate variability this morning?"
- "List my workouts from the past month"
