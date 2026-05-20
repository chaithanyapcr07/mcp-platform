# Sample ServiceNow MCP Connector

This example shows what a connector owner receives after generating a connector from the reusable onboarding templates and lightly customizing it for a ServiceNow-style incident system.

It is intentionally safe for local development:

- Runs in `mock` mode without ServiceNow credentials.
- Uses `.env.example` placeholders for real credentials.
- Exposes read-only tools by default.
- Includes a connector manifest, server, tools, resource, prompt, tests, Dockerfile, and registration instructions.

## Who This Is For

Connector owners who want to build a new enterprise connector using the paved-road MCP onboarding pattern.

## What It Provides

Tools:

- `servicenow.search_incidents`
- `servicenow.get_incident`

Resource:

- `servicenow://incidents/{number}`

Prompt:

- `servicenow_incident_summary_prompt`

## Environment Variables

Copy `.env.example` to `.env` for local development.

```bash
SERVICENOW_AUTH_MODE=mock
SERVICENOW_BASE_URL=
SERVICENOW_API_TOKEN=
CONNECTOR_PORT=4300
```

Use `mock` mode until platform/security approves real credentials and secret references.

## Run Locally

```bash
cd examples/generated-connectors/sample-servicenow
npm install
npm test
npm run dev
```

Health check:

```bash
curl -s http://localhost:4300/health
```

Invoke the mock search tool:

```bash
curl -s -X POST http://localhost:4300/tools/servicenow.search_incidents/invoke \
  -H 'content-type: application/json' \
  -d '{"query":"priority=1","limit":5}'
```

## Register With The MCP Platform

For this starter-kit repo, the platform registry is Git-backed. Add or copy `connector.yaml` into:

```text
registry/connectors/sample-servicenow.yaml
```

Then submit the connector for review through the API or portal once the platform stack is running.

Example API registration payload:

```bash
DEV_TOKEN=$(curl -s -X POST http://localhost:4000/auth/dev-token \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com"}' | jq -r .token)

curl -s -X POST http://localhost:4000/connectors \
  -H "authorization: Bearer $DEV_TOKEN" \
  -H 'content-type: application/json' \
  -d @connector-registration.example.json
```

## Invoke Through The Gateway

After registration, approval, and project access approval:

```bash
curl -s -X POST http://localhost:4000/gateway/connectors/sample-servicenow/tools/servicenow.search_incidents/invoke \
  -H "authorization: Bearer $DEV_TOKEN" \
  -H 'content-type: application/json' \
  -d '{
    "projectId": "ai-platform-demo",
    "input": {
      "query": "priority=1",
      "limit": 5
    }
  }'
```

The gateway, not the agent app, performs auth, RBAC, policy checks, audit logging, metrics, tracing, and SIEM export.

## Add A New Tool

1. Add a file under `src/tools/`.
2. Define a Zod input schema.
3. Export a handler that returns safe structured output.
4. Register the handler in `src/server.ts`.
5. Add the tool to `connector.yaml`.
6. Add a test under `tests/`.
7. Re-run `npm test`.

## Security Checklist

- Keep raw tokens out of Git.
- Use `.env.example` for placeholders only.
- Store production credentials through a secret reference provider.
- Default write tools to disabled or approval-required.
- Avoid logging request bodies that contain customer, employee, or incident details.
- Add risk level and data classification to every tool.
- Confirm denied gateway calls create audit events.

