# Packages

Shared libraries and developer tooling live here.

## Packages

| Package | Purpose |
|---|---|
| `shared-types` | Common TypeScript types and Zod schemas |
| `policy-core` | Internal policy evaluator used by the gateway |
| `connector-sdk` | Helpers for building MCP-style connectors |
| `skill-sdk` | Helpers for authoring platform skills |
| `task-runner` | Platform-owned task execution helpers |
| `gateway-client` | Client for ADK/MDK apps to call MCP Gateway |
| `connector-validator` | Validates connector manifests and generated repos |
| `create-mcp-connector` | CLI generator for connector scaffolds |

## Build And Test

From the repo root:

```bash
npm run build
npm test
```

Build one package:

```bash
npm run build -w @mcp-platform/policy-core
```

## Generate A Connector

```bash
npm run connector:create -- --name my-rest-connector --template generic-rest-api
```

## Validate A Connector

```bash
npm run connector:validate -- --path connectors/jira
```

## ADK/MDK Usage

ADK or MDK applications should use the gateway client instead of calling enterprise systems directly.

```text
Agent App -> Gateway Client -> MCP Gateway -> Policy/RBAC -> Connector Tool
```

See [../examples/adk-agent-jira-search](../examples/adk-agent-jira-search/) and [../examples/mdk-app-template-with-mcp-gateway](../examples/mdk-app-template-with-mcp-gateway/).
