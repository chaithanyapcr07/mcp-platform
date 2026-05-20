import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith("--")) {
      args[value.slice(2)] = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : "true";
    }
  }
  return args;
}

function safeName(value, fallback = "connector") {
  return (value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function title(value) {
  return safeName(value)
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function writeFile(target, relativePath, content) {
  const filePath = path.join(target, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

export function serviceNowRepoFiles({ name, ownerTeam }) {
  const connectorId = safeName(name);
  const systemTitle = title(connectorId.replace(/-mcp-connector$/, ""));
  return {
    "requirements.md": `# ${systemTitle} MCP Connector Requirements

## Business Goal

Enable approved ADK/MDK agents to search, read, create, and update ServiceNow incidents through the governed MCP Gateway.

## Target System

ServiceNow incident management API.

## Users And Personas

- DS / agent developer: consumes approved tools from an agent.
- Connector owner: ${ownerTeam} owns implementation and runtime support.
- Security reviewer: reviews confidential incident data and write actions.
- Platform admin: registers, routes, monitors, and audits gateway usage.

## Allowed Tools

- servicenow.search_incidents
- servicenow.get_incident
- servicenow.create_incident
- servicenow.update_incident

## Denied Tools

- Direct credential access
- User or identity administration
- Bulk delete or destructive incident operations
- Unbounded export of restricted incident content

## Read/Write Intent

Read operations are allowed after project access approval. Write operations require explicit human approval unless a production policy grants automation for a narrow use case.

## Data Classification

confidential

## Auth Method

API token by secret reference in production; mock mode for local development.

## Secrets Required

- SERVICENOW_BASE_URL
- SERVICENOW_API_TOKEN

## Approval Requirements

High-risk write tools require platform/security review and human approval by default.

## Audit Requirements

All allowed and denied tool calls must produce audit events with request_id, trace_id, actor, project_id, connector_id, tool_name, decision, and reason_code.

## Observability Requirements

Gateway and connector requests must emit OpenTelemetry spans and Prometheus metrics without secrets or raw incident payloads.

## Acceptance Criteria

- Connector runs in mock mode locally.
- Manifest validates.
- Write tools are approval_required by default.
- Gateway invocation produces audit, metrics, and traces.
- Registration request identifies owner_team, runtime_owner, security_reviewer, deployment_mode, data_classification, and requested_tools.
`,
    "design.md": `# ${systemTitle} MCP Connector Design

## Connector Architecture

The connector is a team-owned remote MCP runtime. ADK/MDK apps call MCP Gateway; MCP Gateway performs auth, RBAC, policy, audit, metrics, and trace propagation before routing to this connector.

## MCP Tools

- servicenow.search_incidents: read-only incident search.
- servicenow.get_incident: read a single incident.
- servicenow.create_incident: high-risk write action, approval_required.
- servicenow.update_incident: high-risk write action, approval_required.

## MCP Resources

- servicenow://incidents/{number}

## MCP Prompts

- servicenow_incident_triage_prompt

## Runtime Deployment Mode

remote: ${ownerTeam} deploys and operates the connector runtime. AI Platform owns gateway routing and governance controls.

## Auth And Secret Handling

Production credentials are referenced by secret_ref only. Raw tokens must not be committed, stored in the registry, or exported in telemetry.

## Gateway Interaction

Agent -> MCP Gateway -> Auth/RBAC/Policy -> Connector runtime -> ServiceNow API or mock adapter.

## Policy Enforcement

Read tools require approved project access. Write tools return approval_required unless the project has explicit write automation approval.

## Trace, Metric, And Audit Behavior

The connector accepts trace context from the gateway, emits connector spans, returns safe errors, and includes request_id in responses.

## Failure Modes

- ServiceNow unavailable: return CONNECTOR_UPSTREAM_UNAVAILABLE.
- Invalid input: return CONNECTOR_VALIDATION_FAILED.
- Missing credentials: fail startup in real mode.
- Policy denial: gateway denies before connector invocation.

## Ownership Model

${ownerTeam} owns implementation, tests, runtime SLO, upstream API changes, and connector-specific support.

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
  participant Agent as ADK Agent
  participant Gateway as MCP Gateway
  participant Policy as RBAC/Policy
  participant Connector as ServiceNow Connector
  participant SN as ServiceNow
  Agent->>Gateway: invoke servicenow.search_incidents
  Gateway->>Policy: validate auth, project, tool, risk
  Policy-->>Gateway: allowed or approval_required
  Gateway->>Connector: invoke tool with trace context
  Connector->>SN: call API or mock adapter
  SN-->>Connector: incident result
  Connector-->>Gateway: safe structured output
  Gateway-->>Agent: governed response
\`\`\`
`,
    "tasks.md": `# ${systemTitle} MCP Connector Tasks

## Implementation Tasks

- Implement mock and real ServiceNow adapters.
- Implement search, get, create, and update tools.
- Implement incident resource and triage prompt.
- Add safe error mapping and input validation.

## Test Tasks

- Unit test tool handlers.
- Test write tools are approval_required in policy.
- Test mock mode without credentials.
- Test manifest and registration request fields.

## Security Review Tasks

- Confirm no raw secrets are committed.
- Confirm confidential classification.
- Confirm high-risk write action approval policy.
- Confirm telemetry sanitizer excludes tokens and raw incident bodies.

## Documentation Tasks

- Document env vars, local run, gateway invocation, support channel, and ownership.

## Registration Tasks

- Submit connector.yaml and registration-request.yaml.
- Route to platform and security review.

## Deployment Tasks

- Deploy to dev, staging, then prod after approvals.
- Configure runtime_url and health checks per environment.

## Approval Tasks

- Approve connector registration.
- Approve project access.
- Approve or deny write-tool automation policy.
`,
    "connector.yaml": `id: ${connectorId}
name: ${systemTitle} MCP Connector
description: Team-owned ServiceNow MCP connector generated through Spec-Driven Development onboarding.
owner_team: ${ownerTeam}
runtime_owner: ${ownerTeam}
business_owner: ${ownerTeam}
security_reviewer: security-platform
support_channel: "#service-management-platform"
on_call_rotation: service-management-platform-primary
business_domain: service-management
connector_type: issue_tracker
version: 0.1.0
status: draft
runtime_type: remote
deployment_mode: remote
runtime_url: https://servicenow-mcp-connector.internal.example.com
environment: dev
slo:
  availability: "99.5"
  latency_p95_ms: 800
maintenance:
  patch_window: Tuesdays 18:00-20:00 local
  owner_review_interval: quarterly
deprecation_policy: 90-day notice before disabling production versions
auth_type: api_token
risk_level: high
data_classification: confidential
required_scopes:
  - incident:read
  - incident:write
tools:
  - name: servicenow.search_incidents
    description: Search ServiceNow incidents.
    type: read
    risk_level: low
    permission: tool:execute
  - name: servicenow.get_incident
    description: Read a ServiceNow incident by number.
    type: read
    risk_level: low
    permission: tool:execute
  - name: servicenow.create_incident
    description: Create a ServiceNow incident.
    type: write
    risk_level: high
    permission: tool:execute
    requires_human_approval: true
  - name: servicenow.update_incident
    description: Update an existing ServiceNow incident.
    type: write
    risk_level: high
    permission: tool:execute
    requires_human_approval: true
resources:
  - name: servicenow_incident
    uri: servicenow://incidents/{number}
    description: Read-only ServiceNow incident resource.
prompts:
  - name: servicenow_incident_triage_prompt
    description: Prompt for triaging a ServiceNow incident.
policies:
  audit_all_calls: true
  allow_write_actions_by_default: false
  require_project_access: true
  require_human_approval_for_write_tools: true
`,
    "policy.yaml": `id: servicenow-write-action-approval
description: Generated default policy for ServiceNow write tools.
connector_id: ${connectorId}
defaults:
  write_tools: approval_required
  read_tools: project_access_required
rules:
  - tool: servicenow.create_incident
    decision: approval_required
    reason_code: HIGH_RISK_WRITE_REQUIRES_APPROVAL
  - tool: servicenow.update_incident
    decision: approval_required
    reason_code: HIGH_RISK_WRITE_REQUIRES_APPROVAL
`,
    "README.md": `# ${systemTitle} MCP Connector

This is a generated connector repo owned by ${ownerTeam}. It is not a platform-owned common connector unless AI Platform explicitly adopts it.

## Local Development

\`\`\`bash
cp .env.example .env
npm install
npm test
npm run dev
\`\`\`

## Tools

- servicenow.search_incidents
- servicenow.get_incident
- servicenow.create_incident
- servicenow.update_incident

## Register

Submit \`registration-request.yaml\`, \`connector.yaml\`, \`policy.yaml\`, and \`validation-report.md\` to platform/security review.
`,
    "package.json": `{
  "name": "${connectorId}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "test": "vitest run",
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.19.11",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
`,
    ".env.example": `SERVICENOW_AUTH_MODE=mock
SERVICENOW_BASE_URL=
SERVICENOW_API_TOKEN=
CONNECTOR_PORT=4300
`,
    "Dockerfile": `FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install && npm test
EXPOSE 4300
CMD ["npm","run","dev"]
`,
    "src/server.ts": `import Fastify from "fastify";
import { createIncident } from "./tools/createIncident.js";
import { getIncident } from "./tools/getIncident.js";
import { searchIncidents } from "./tools/searchIncidents.js";
import { updateIncident } from "./tools/updateIncident.js";

const app = Fastify({ logger: true });
const connectorId = "${connectorId}";

app.get("/health", async () => ({ ok: true, connectorId, mode: process.env.SERVICENOW_AUTH_MODE ?? "mock" }));
app.get("/manifest", async () => ({ connectorId, tools: ["servicenow.search_incidents", "servicenow.get_incident", "servicenow.create_incident", "servicenow.update_incident"] }));
app.post("/tools/servicenow.search_incidents/invoke", async (request) => searchIncidents(request.body));
app.post("/tools/servicenow.get_incident/invoke", async (request) => getIncident(request.body));
app.post("/tools/servicenow.create_incident/invoke", async (request) => createIncident(request.body));
app.post("/tools/servicenow.update_incident/invoke", async (request) => updateIncident(request.body));

const port = Number(process.env.CONNECTOR_PORT ?? 4300);
await app.listen({ host: "0.0.0.0", port });
`,
    "src/tools/searchIncidents.ts": `export function searchIncidents(input: unknown) {
  return { mode: process.env.SERVICENOW_AUTH_MODE ?? "mock", incidents: [], input };
}
`,
    "src/tools/getIncident.ts": `export function getIncident(input: unknown) {
  return { mode: process.env.SERVICENOW_AUTH_MODE ?? "mock", incident: null, input };
}
`,
    "src/tools/createIncident.ts": `export function createIncident(input: unknown) {
  return { mode: process.env.SERVICENOW_AUTH_MODE ?? "mock", approvalRequired: true, input };
}
`,
    "src/tools/updateIncident.ts": `export function updateIncident(input: unknown) {
  return { mode: process.env.SERVICENOW_AUTH_MODE ?? "mock", approvalRequired: true, input };
}
`,
    "src/resources/incidentResource.ts": `export const incidentResource = {
  uri: "servicenow://incidents/{number}",
  description: "Read-only ServiceNow incident resource."
};
`,
    "src/prompts/incidentTriagePrompt.ts": `export const incidentTriagePrompt = {
  name: "servicenow_incident_triage_prompt",
  description: "Prepare a safe incident triage summary from approved incident fields."
};
`,
    "src/auth/serviceNowAuth.ts": `export function loadServiceNowAuth(env = process.env) {
  return {
    mode: env.SERVICENOW_AUTH_MODE ?? "mock",
    baseUrl: env.SERVICENOW_BASE_URL,
    tokenRef: env.SERVICENOW_API_TOKEN ? "local-env-placeholder" : undefined
  };
}
`,
    "tests/connector.test.ts": `import { describe, expect, it } from "vitest";
import { createIncident } from "../src/tools/createIncident.js";
import { searchIncidents } from "../src/tools/searchIncidents.js";

describe("generated ServiceNow connector", () => {
  it("runs read tools in mock mode", () => {
    expect(searchIncidents({ query: "priority=1" }).mode).toBeTruthy();
  });

  it("marks write tools as approval required", () => {
    expect(createIncident({ shortDescription: "Example" }).approvalRequired).toBe(true);
  });
});
`,
    "validation-report.md": `# Validation Report

Generated by self-service onboarding.

## Results

- SDD artifacts generated: pass
- Connector manifest generated: pass
- Policy marks write tools approval_required: pass
- Secret placeholders only: pass
- Local mock runtime scaffold generated: pass

## Required Before Production

- Replace mock adapter with approved ServiceNow API adapter.
- Configure secret references.
- Complete security review.
- Complete staging gateway validation.
`,
    "registration-request.yaml": `requester: service.owner@example.com
project_id: ai-platform-demo
team: ${ownerTeam}
desired_system: servicenow
connector_id: ${connectorId}
owner_team: ${ownerTeam}
runtime_owner: ${ownerTeam}
business_owner: ${ownerTeam}
security_reviewer: security-platform
deployment_mode: remote
data_classification: confidential
requested_tools:
  - servicenow.search_incidents
  - servicenow.get_incident
  - servicenow.create_incident
  - servicenow.update_incident
read_or_write_intent: read_write
business_justification: Enable approved incident-response agents to work with ServiceNow incidents through MCP Gateway.
expected_volume: 500 requests/day
approval_required: true
approvers:
  - security-platform
  - ai-platform
status: submitted
`
  };
}

export function generateServiceNowRepo({ name = "servicenow-mcp-connector", ownerTeam = "service-management-platform", output = "generated-repos" }) {
  const repoName = safeName(name);
  const target = path.resolve(process.cwd(), output, repoName);
  const files = serviceNowRepoFiles({ name: repoName, ownerTeam });
  for (const [relativePath, content] of Object.entries(files)) {
    writeFile(target, relativePath, content);
  }
  return target;
}

export function generateAccessRequest({ connector, project, tools, output = "generated-requests" }) {
  if (!connector || !project || !tools) {
    throw new Error("--connector, --project, and --tools are required");
  }
  const connectorId = safeName(connector);
  const projectId = safeName(project);
  const toolList = tools.split(",").map((tool) => tool.trim()).filter(Boolean);
  const target = path.resolve(process.cwd(), output);
  const fileName = `${projectId}-${connectorId}-access-request.yaml`;
  writeFile(target, fileName, `requester: developer@example.com
project_id: ${project}
team: ai-platform
connector_id: ${connector}
requested_tools:
${toolList.map((tool) => `  - ${tool}`).join("\n")}
read_or_write_intent: read
business_justification: Use approved ${connector} tools from an ADK/MDK agent through MCP Gateway.
data_classification: confidential
expected_volume: 100 requests/day
approval_required: true
approvers:
  - ai-platform
  - security-platform
status: requested
`);
  return path.join(target, fileName);
}

export async function maybeCreateGitHubRepo({ repoName, target }) {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_ORG) {
    return { created: false, reason: "GITHUB_TOKEN and GITHUB_ORG are not configured", target };
  }

  const response = await fetch(`https://api.github.com/orgs/${process.env.GITHUB_ORG}/repos`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      name: repoName,
      private: true,
      description: "Generated MCP connector repo"
    })
  });

  if (!response.ok) {
    return { created: false, reason: `GitHub API returned ${response.status}`, target };
  }

  const body = await response.json();
  return { created: true, url: body.html_url, target };
}
