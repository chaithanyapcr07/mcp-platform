import { devToken, printJson, request } from "./demo-utils.mjs";

const token = process.env.DEV_TOKEN ?? await devToken("developer@example.com");
const { response, body } = await request("/gateway/connectors/jira/tools/jira.search_issues/invoke", {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "x-correlation-id": `demo-jira-search-${Date.now()}`
  },
  body: JSON.stringify({
    projectId: process.env.MCP_PROJECT_ID ?? "ai-platform-demo",
    input: {
      jql: "project = DEMO ORDER BY created DESC",
      maxResults: 10
    }
  })
});

if (!response.ok) {
  printJson("Jira search failed", body);
  process.exit(1);
}

printJson("Jira search succeeded through MCP Gateway", {
  requestId: body.requestId,
  connectorId: body.connectorId,
  toolName: body.toolName,
  issueCount: body.output?.issues?.length ?? body.output?.total ?? 0,
  output: body.output
});
