#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const supportedTemplates = [
  "generic-rest-api",
  "jira-like-issue-tracker",
  "github-like-code-host",
  "database-readonly",
  "document-retrieval",
  "internal-tool",
  "custom-team-owned"
];

function parseArgs(argv) {
  const args = { output: "connectors" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--name") args.name = argv[++index];
    else if (value === "--template") args.template = argv[++index];
    else if (value === "--output") args.output = argv[++index];
    else if (value === "--help" || value === "-h") args.help = true;
  }
  return args;
}

function usage() {
  return `Usage:
  npm run create:connector -- --name my-jira-connector --template jira-like-issue-tracker

Options:
  --name       Connector folder and manifest id
  --template   ${supportedTemplates.join(", ")}
  --output     Output parent directory, defaults to connectors
`;
}

function assertSafeName(name) {
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error("--name must use lowercase letters, numbers, and dashes only");
  }
}

function toolForTemplate(template) {
  if (template === "jira-like-issue-tracker") {
    return {
      name: "issue.search",
      description: "Search issues from the enterprise issue tracker.",
      env: "ISSUE_TRACKER_BASE_URL=\nISSUE_TRACKER_API_TOKEN=\nAUTH_MODE=mock\n",
      domain: "issue-tracking"
    };
  }
  if (template === "github-like-code-host") {
    return {
      name: "repo.search",
      description: "Search repositories, pull requests, and issues.",
      env: "CODE_HOST_BASE_URL=\nCODE_HOST_TOKEN=\nAUTH_MODE=mock\n",
      domain: "software-delivery"
    };
  }
  if (template === "document-retrieval") {
    return {
      name: "documents.search",
      description: "Search approved document sources.",
      env: "DOCUMENT_SOURCE_URL=\nDOCUMENT_SOURCE_TOKEN=\nAUTH_MODE=mock\n",
      domain: "knowledge"
    };
  }
  if (template === "database-readonly") {
    return {
      name: "database.query_readonly",
      description: "Run approved read-only database queries.",
      env: "DATABASE_READONLY_URL=\nAUTH_MODE=mock\n",
      domain: "data"
    };
  }
  if (template === "internal-tool") {
    return {
      name: "internal.run_action",
      description: "Invoke an approved internal tool action.",
      env: "INTERNAL_TOOL_URL=\nINTERNAL_TOOL_TOKEN=\nAUTH_MODE=mock\n",
      domain: "operations"
    };
  }
  return {
    name: "rest.search",
    description: "Call an approved REST API endpoint.",
    env: "REST_API_BASE_URL=\nREST_API_TOKEN=\nAUTH_MODE=mock\n",
    domain: "enterprise"
  };
}

function filesFor({ name, template }) {
  const tool = toolForTemplate(template);
  const title = name.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
  return {
    "README.md": `# ${title} MCP Connector

Generated from the \`${template}\` template.

## What It Does

This connector exposes one starter MCP-style tool, one resource shape, and one prompt placeholder through an HTTP runtime that the MCP Gateway can call.

## Environment

\`\`\`bash
cp .env.example .env
\`\`\`

## Local Startup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Tools

- \`${tool.name}\`: ${tool.description}

## Resources

- \`${name}://resources/{id}\`

## Prompts

- \`${name}_starter_prompt\`

## Register With The Platform

1. Review \`connector.yaml\`.
2. Add or copy the manifest into \`registry/connectors/${name}.yaml\`.
3. Seed or register through \`POST /connectors\`.
4. Request access through \`POST /projects/{projectId}/connectors/${name}/request-access\`.

## Invoke Through The Gateway

\`\`\`bash
curl -s -X POST http://localhost:4000/gateway/connectors/${name}/tools/${tool.name}/invoke \\
  -H "authorization: Bearer $TOKEN" \\
  -H "content-type: application/json" \\
  -d '{"projectId":"ai-platform-demo","input":{"query":"example"}}'
\`\`\`

## Add A New Tool

1. Add a file under \`src/tools\`.
2. Validate inputs.
3. Register the handler in \`src/server.ts\`.
4. Add tool metadata to \`connector.yaml\`.
5. Add a test.

## Security Checklist

- Do not commit raw secrets.
- Use secret references in platform registry metadata.
- Mark write tools clearly.
- Add tool-level permissions.
- Verify allowed and denied audit events.
`,
    ".env.example": `${tool.env}CONNECTOR_PORT=4300\n`,
    "connector.yaml": `id: ${name}
name: ${title} MCP Connector
description: Generated ${template} connector scaffold.
owner_team: owning-team
business_domain: ${tool.domain}
connector_type: ${template}
version: 0.1.0
status: draft
runtime_type: custom
auth_type: api_key
required_scopes: [read]
risk_level: low
data_classification: internal
tools:
  - name: ${tool.name}
    description: ${tool.description}
    type: read
    risk_level: low
    permission: tool:execute
resources:
  - name: starter_resource
    uri: ${name}://resources/{id}
    description: Starter resource shape.
prompts:
  - name: ${name}_starter_prompt
    description: Starter prompt for this connector.
policies:
  audit_all_calls: true
  allow_write_actions_by_default: false
  require_project_access: true
`,
    "Dockerfile": `FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install && npm test
EXPOSE 4300
CMD ["npm","run","dev"]
`,
    "package.json": `{
  "name": "@team/${name}",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "tsx": "^4.19.2",
    "vitest": "^2.1.5",
    "typescript": "^5.6.3"
  }
}
`,
    "src/server.ts": `import Fastify from "fastify";

const app = Fastify({ logger: true });
const connectorId = "${name}";

app.get("/health", async () => ({ ok: true, connectorId }));
app.get("/manifest", async () => ({ connectorId, template: "${template}" }));

app.post("/tools/${tool.name}/invoke", async (request) => ({
  connectorId,
  toolName: "${tool.name}",
  mode: process.env.AUTH_MODE ?? "mock",
  input: request.body,
  items: []
}));

const port = Number(process.env.CONNECTOR_PORT ?? 4300);
await app.listen({ host: "0.0.0.0", port });
`,
    "src/tools/exampleTool.ts": `export function exampleTool(input: Record<string, unknown>) {
  return { items: [], input };
}
`,
    "src/resources/exampleResource.ts": `export const exampleResource = {
  uri: "${name}://resources/{id}",
  description: "Starter resource shape."
};
`,
    "src/prompts/starterPrompt.ts": `export const starterPrompt = {
  name: "${name}_starter_prompt",
  description: "Starter prompt for ${title}."
};
`,
    "src/auth/authConfig.ts": `export function loadAuthConfig(env = process.env) {
  return {
    mode: env.AUTH_MODE ?? "mock"
  };
}
`,
    "tests/connector.test.ts": `import { describe, expect, it } from "vitest";

describe("${name}", () => {
  it("has a generated test harness", () => {
    expect("${template}").toBeTruthy();
  });
});
`,
    "fixtures/sample-request.json": JSON.stringify({ query: "example" }, null, 2)
  };
}

export function generateConnector(options) {
  assertSafeName(options.name);
  if (!supportedTemplates.includes(options.template)) {
    throw new Error(`Unsupported template ${options.template}`);
  }
  const target = path.resolve(process.cwd(), options.output ?? "connectors", options.name);
  if (fs.existsSync(target)) {
    throw new Error(`Target already exists: ${target}`);
  }
  const files = filesFor(options);
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(target, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return target;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log(usage());
      process.exit(0);
    }
    if (!args.name || !args.template) throw new Error("--name and --template are required");
    const target = generateConnector(args);
    console.log(`Created connector scaffold at ${target}`);
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(1);
  }
}
