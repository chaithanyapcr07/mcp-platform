import { devToken, printJson, request } from "./demo-utils.mjs";

const token = process.env.DEV_TOKEN ?? await devToken("developer@example.com");
const { response, body } = await request("/gateway/connectors/jira/tools/jira.create_issue/invoke", {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "x-correlation-id": `demo-jira-denied-write-${Date.now()}`
  },
  body: JSON.stringify({
    projectId: process.env.MCP_PROJECT_ID ?? "ai-platform-demo",
    input: {
      projectKey: "DEMO",
      summary: "Denied write validation",
      description: "This write request should be blocked until approval is implemented."
    }
  })
});

if (response.status === 403 || response.status === 409) {
  printJson("Jira write was denied as expected", {
    status: response.status,
    error: body.error,
    reason: body.reason,
    requestId: body.requestId
  });
  process.exit(0);
}

printJson("Unexpected Jira write result", { status: response.status, body });
process.exit(1);
