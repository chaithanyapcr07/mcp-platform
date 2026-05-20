# ADK Agent Example: Jira Search Through MCP Gateway

This example shows an ADK-style agent calling MCP Gateway instead of calling Jira directly.

## Files

- `agent.yaml`: agent and MCP Gateway config
- `.env.example`: local environment values
- `client.py`: dependency-free Python client

## Run

```bash
npm run platform:start
cp examples/adk-agent-jira-search/.env.example examples/adk-agent-jira-search/.env
python3 examples/adk-agent-jira-search/client.py
```

Expected gateway response:

```json
{
  "requestId": "...",
  "connectorId": "jira",
  "toolName": "jira.search_issues",
  "output": {
    "issues": []
  }
}
```

## Curl Alternative

```bash
npm run demo:jira-search
npm run demo:jira-denied-write
```

The denied write example proves that the agent receives governed access through MCP Gateway, not direct Jira API access.
