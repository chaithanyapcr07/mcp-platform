import Fastify from "fastify";
import { loadServiceNowAuthConfig, assertServiceNowConfig } from "./auth/serviceNowAuth.js";
import { ServiceNowClient } from "./client.js";
import { createIncident } from "./tools/createIncident.js";
import { getIncident } from "./tools/getIncident.js";
import { searchIncidents } from "./tools/searchIncidents.js";
import { updateIncident } from "./tools/updateIncident.js";
import { incidentResource, readIncidentResource } from "./resources/incidentResource.js";
import { incidentTriagePrompt } from "./prompts/incidentTriagePrompt.js";

const config = loadServiceNowAuthConfig();
assertServiceNowConfig(config);
const client = new ServiceNowClient(config);
const app = Fastify({ logger: true });

const manifest = {
  id: "servicenow",
  name: "ServiceNow MCP Connector",
  authMode: config.mode,
  tools: ["servicenow.search_incidents", "servicenow.get_incident", "servicenow.create_incident", "servicenow.update_incident"],
  resources: [incidentResource],
  prompts: [incidentTriagePrompt]
};

const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  "servicenow.search_incidents": (input) => searchIncidents(client, input),
  "servicenow.get_incident": (input) => getIncident(client, input),
  "servicenow.create_incident": (input) => createIncident(client, input),
  "servicenow.update_incident": (input) => updateIncident(client, input)
};

app.get("/health", async () => ({ ok: true, connectorId: "servicenow", authMode: config.mode }));
app.get("/manifest", async () => manifest);
app.get("/resources/incidents/:number", async (request: any) => readIncidentResource(client, `servicenow://incidents/${request.params.number}`));
app.get("/prompts/servicenow_incident_triage_prompt", async () => incidentTriagePrompt);
app.post("/tools/:toolName/invoke", async (request: any, reply) => {
  const toolName = decodeURIComponent(request.params.toolName);
  const handler = handlers[toolName];
  if (!handler) {
    reply.status(404).send({ error: "TOOL_NOT_FOUND", message: `Unknown ServiceNow tool ${toolName}` });
    return;
  }
  try {
    return await handler(request.body ?? {});
  } catch (error: any) {
    reply.status(400).send({ error: "SERVICENOW_CONNECTOR_ERROR", message: error.message });
  }
});

const port = Number(process.env.SERVICENOW_CONNECTOR_PORT ?? 4300);
await app.listen({ host: "0.0.0.0", port });

