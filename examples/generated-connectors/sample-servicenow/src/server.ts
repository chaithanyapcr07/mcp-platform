import Fastify from "fastify";
import { assertServiceNowAuthReady, loadServiceNowAuthConfig } from "./auth/servicenowAuth.js";
import { serviceNowIncidentSummaryPrompt } from "./prompts/incidentSummaryPrompt.js";
import { readIncidentResource } from "./resources/incidentResource.js";
import { getIncident } from "./tools/getIncident.js";
import { searchIncidents } from "./tools/searchIncidents.js";

const manifest = {
  id: "sample-servicenow",
  name: "Sample ServiceNow MCP Connector",
  tools: ["servicenow.search_incidents", "servicenow.get_incident"],
  resources: ["servicenow://incidents/{number}"],
  prompts: ["servicenow_incident_summary_prompt"]
};

export function buildServer() {
  const app = Fastify({ logger: true });
  const authConfig = loadServiceNowAuthConfig();
  assertServiceNowAuthReady(authConfig);

  app.get("/health", async () => ({
    status: "ok",
    connectorId: manifest.id,
    authMode: authConfig.mode
  }));

  app.get("/manifest", async () => manifest);

  app.post<{ Params: { toolName: string }; Body: { input?: unknown } }>(
    "/tools/:toolName/invoke",
    async (request, reply) => {
      const input = request.body.input ?? request.body;

      if (request.params.toolName === "servicenow.search_incidents") {
        return searchIncidents(input as never);
      }

      if (request.params.toolName === "servicenow.get_incident") {
        return getIncident(input as never);
      }

      return reply.code(404).send({
        error: "TOOL_NOT_FOUND",
        reason: `Unknown tool ${request.params.toolName}`
      });
    }
  );

  app.get<{ Params: { number: string } }>("/resources/incidents/:number", async (request) => {
    return readIncidentResource(request.params.number);
  });

  app.get("/prompts/servicenow_incident_summary_prompt", async () => {
    return serviceNowIncidentSummaryPrompt();
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.CONNECTOR_PORT ?? "4300");
  const app = buildServer();
  await app.listen({ host: "0.0.0.0", port });
}

