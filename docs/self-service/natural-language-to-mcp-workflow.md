# Natural Language To MCP Workflow

The agent turns plain English into MCP Platform actions.

```mermaid
sequenceDiagram
  participant User
  participant Agent
  participant Router
  participant Planner
  participant Gateway
  participant Connector
  participant Audit
  User->>Agent: "Can you search Jira issues?"
  Agent->>Router: classify intent
  Router-->>Agent: connector_tool_execution
  Agent->>Planner: map to workflow
  Planner-->>Agent: jira.search_issues
  Agent->>Gateway: POST /gateway/connectors/jira/tools/jira.search_issues/invoke
  Gateway->>Connector: invoke governed tool
  Connector-->>Gateway: result
  Gateway-->>Agent: result
  Agent->>Audit: write agent decision
  Agent-->>User: response
```

The agent never calls Jira, ServiceNow, GitHub, Slack, databases, or any enterprise system directly. It either creates a platform request or calls MCP Gateway.

## Examples

```bash
npm run demo:agent-search-jira
npm run demo:agent-create-servicenow-ticket
npm run demo:agent-onboard-servicenow
```

Use `examples/agent-requests/` to see the raw request payloads.
