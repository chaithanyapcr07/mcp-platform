# Connector SDK

Small TypeScript helper for defining connector manifests and tool handlers.

```ts
import { defineConnector } from "@mcp-platform/connector-sdk";

const connector = defineConnector(manifest);

connector.tool({
  name: "jira.search_issues",
  description: "Search Jira issues",
  inputSchema: {},
  outputSchema: {},
  permissions: ["tool:execute"],
  write: false,
  riskLevel: "low"
}, async (input) => {
  return { issues: [] };
});
```

Connector runtimes should expose:

- `GET /health`
- `GET /manifest`
- `POST /tools/{toolName}/invoke`

ADK and MDK applications should call the MCP Gateway, not connector runtimes directly.
