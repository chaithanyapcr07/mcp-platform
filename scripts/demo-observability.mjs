import { gatewayUrl, printJson, request } from "./demo-utils.mjs";

const { response, body } = await request("/observability/health");
if (!response.ok) {
  printJson("Observability health check failed", body);
  process.exit(1);
}

printJson("Observability health", body);

console.log("\nOpen these local URLs:");
console.log(`- API metrics: ${gatewayUrl()}/metrics`);
console.log("- Prometheus targets: http://localhost:9090/targets");
console.log("- Grafana dashboards: http://localhost:3001/dashboards");
console.log("- Jaeger traces: http://localhost:16686");
console.log("\nAfter running npm run demo:jira-search, check:");
console.log("- Grafana folder: MCP Platform");
console.log("- Prometheus query: mcp_gateway_requests_total");
console.log("- Jaeger services: mcp-platform-api and mcp-jira-connector");
console.log("- Audit export status: GET /audit/export/status with an auditor token");
