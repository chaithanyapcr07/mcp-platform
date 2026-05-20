import { devToken, printJson, request } from "./demo-utils.mjs";

const token = process.env.DEV_TOKEN ?? await devToken("developer@example.com");
const result = await request("/gateway/connectors/servicenow/tools/servicenow.search_incidents/invoke", {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "x-correlation-id": `demo-servicenow-search-${Date.now()}`
  },
  body: JSON.stringify({
    projectId: "ai-platform-demo",
    input: {
      query: "checkout",
      limit: 10
    }
  })
});

if (!result.response.ok) {
  printJson("ServiceNow search failed", result.body);
  process.exit(1);
}

printJson("ServiceNow search succeeded through MCP Gateway", result.body);

