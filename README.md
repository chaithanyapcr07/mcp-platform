# MCP Platform

Enterprise-oriented MCP platform MVP for discovering, registering, governing, securing, deploying, and consuming MCP connectors. The platform treats MCP tools, resources, and prompts as native connector capabilities, while Skills and Tasks are enterprise-owned abstractions with versioning, policy, approvals, evals, and audit.

## What Is Included

- Fastify control plane API with mock JWT auth, RBAC, policy checks, audit events, registries, projects, templates, and gateway routes.
- Prisma PostgreSQL schema for live runtime state.
- React developer portal for connector, skill, task, access, audit, and template workflows.
- Connector SDK, Skill SDK, Task Runner, Policy Core, and shared type packages.
- Git-backed seed definitions for common enterprise connectors, skills, tasks, policies, approvals, evals, and templates.
- Working `local-knowledge-base` connector exposed through the gateway.
- Docker Compose local environment.

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
docker compose -f infra/docker-compose.yml up --build
```

API: `http://localhost:4000`  
Web: `http://localhost:3000`  
Local knowledge base connector: `http://localhost:4100`

## Development Without Docker

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:connector
npm run dev
npm run dev:web
```

## Mock Auth

Use the local auth endpoint to mint development tokens:

```bash
curl -s -X POST http://localhost:4000/auth/dev-token \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com"}'
```

Seed users include:

- `admin@example.com`: platform admin
- `security@example.com`: security reviewer
- `developer@example.com`: project developer and connector/skill/task consumer
- `auditor@example.com`: auditor

## Sample API Calls

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/dev-token \
  -H 'content-type: application/json' \
  -d '{"email":"developer@example.com"}' | jq -r .token)

curl -s http://localhost:4000/connectors \
  -H "authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:4000/gateway/connectors/local-knowledge-base/tools/search_items/invoke \
  -H "authorization: Bearer $TOKEN" \
  -H "x-project-id: platform-internal" \
  -H "content-type: application/json" \
  -d '{"query":"runbook"}'

curl -s -X POST http://localhost:4000/gateway/tasks/search-runbook-and-draft-response/execute \
  -H "authorization: Bearer $TOKEN" \
  -H "x-project-id: platform-internal" \
  -H "content-type: application/json" \
  -d '{"query":"database failover"}'
```

## Test

```bash
npm test
```

For non-interactive environments, apply the checked-in migration with:

```bash
npm run db:deploy -w @mcp-platform/api
```

## Repository Model

Git stores desired definitions, templates, examples, and documentation under `registry/`, `packages/templates/`, `examples/`, and `docs/`. Runtime state such as audit logs, access approvals, task executions, user sessions, and secret material belongs in the database or external systems.

## Known Limitations

- The MVP uses mock JWT auth and a mock secret provider.
- The gateway invokes the sample connector over HTTP and includes extension points for MCP transport adapters.
- Approval workflows are modeled and enforced, but notifications and ticketing integrations are intentionally stubbed.
- The developer portal is a functional internal console, not a polished product shell.

## Next Steps

- Replace mock auth with enterprise OIDC or SAML-backed identity.
- Externalize policy evaluation to OPA or Cedar.
- Move the gateway to an independently scalable service.
- Integrate Vault or cloud secret managers.
- Add OpenTelemetry traces, Prometheus metrics, and SIEM audit export.
