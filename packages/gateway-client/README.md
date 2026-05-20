# MCP Gateway Client

Typed client for ADK/MDK apps that call MCP Gateway instead of calling enterprise systems directly.

```ts
import { McpGatewayClient } from "@mcp-platform/gateway-client";

const client = new McpGatewayClient({
  gatewayUrl: "http://localhost:4000",
  token: process.env.DEV_TOKEN,
  projectId: "ai-platform-demo"
});

const result = await client.invokeTool("jira", "jira.search_issues", {
  jql: "project = DEMO ORDER BY created DESC",
  maxResults: 10
});
```

The client preserves request IDs and returns structured gateway errors, including `approval_required` responses for high-risk write tools.

