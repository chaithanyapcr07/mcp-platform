import Fastify from "fastify";
import { createIncident } from "./tools/createIncident.js";
import { getIncident } from "./tools/getIncident.js";
import { searchIncidents } from "./tools/searchIncidents.js";
import { updateIncident } from "./tools/updateIncident.js";

const app = Fastify({ logger: true });
const connectorId = "servicenow-mcp-connector";

app.get("/health", async () => ({ ok: true, connectorId, mode: process.env.SERVICENOW_AUTH_MODE ?? "mock" }));
app.get("/manifest", async () => ({ connectorId, tools: ["servicenow.search_incidents", "servicenow.get_incident", "servicenow.create_incident", "servicenow.update_incident"] }));
app.post("/tools/servicenow.search_incidents/invoke", async (request) => searchIncidents(request.body));
app.post("/tools/servicenow.get_incident/invoke", async (request) => getIncident(request.body));
app.post("/tools/servicenow.create_incident/invoke", async (request) => createIncident(request.body));
app.post("/tools/servicenow.update_incident/invoke", async (request) => updateIncident(request.body));

const port = Number(process.env.CONNECTOR_PORT ?? 4300);
await app.listen({ host: "0.0.0.0", port });
