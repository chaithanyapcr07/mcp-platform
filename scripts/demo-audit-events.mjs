import { devToken, printJson, request } from "./demo-utils.mjs";

const token = process.env.AUDITOR_TOKEN ?? await devToken("auditor@example.com");
const { response, body } = await request("/audit/events?take=10", {
  headers: {
    authorization: `Bearer ${token}`
  }
});

if (!response.ok) {
  printJson("Audit event query failed", body);
  process.exit(1);
}

printJson("Recent MCP audit events", body.map((event) => ({
  timestamp: event.timestamp,
  requestId: event.requestId,
  action: event.action,
  connectorId: event.connectorId,
  toolName: event.toolName,
  decision: event.decision,
  reasonCode: event.reasonCode,
  traceId: event.traceId
})));
