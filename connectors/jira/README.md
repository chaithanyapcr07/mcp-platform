# Jira MCP Connector

The Jira connector is the first end-to-end connector example for this MCP Platform starter kit. It shows how an enterprise team can expose Jira tools through the MCP Gateway instead of letting ADK agents call Jira directly.

## Modes

- `mock`: local development with seeded in-memory issues and no Jira credentials.
- `api_token`: real Jira Cloud API mode using environment variables.

## Environment

```bash
cp connectors/jira/.env.example connectors/jira/.env
```

Mock mode:

```bash
JIRA_AUTH_MODE=mock
JIRA_CONNECTOR_PORT=4200
```

Real mode:

```bash
JIRA_AUTH_MODE=api_token
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-token
```

Never commit real credentials. The platform stores secret references in registry/runtime state; connector runtimes receive credentials through environment or a future secret provider integration.

## Run Locally

```bash
npm install
npm run dev:jira
```

Health:

```bash
curl http://localhost:4200/health
```

## Tools

- `jira.search_issues`: read, low risk
- `jira.get_issue`: read, low risk
- `jira.create_issue`: write, high risk, human approval required
- `jira.add_comment`: write, medium risk, human approval required
- `jira.transition_issue`: write, high risk, human approval required

## Resource

- `jira://issues/{issueKey}`

## Prompt

- `jira_bug_triage_prompt`

## Register With The Platform

The registry definition lives at `registry/connectors/jira.yaml`. Seed data registers it automatically:

```bash
npm run db:seed
```

Manual registration through the API:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/dev-token \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com"}' | jq -r .token)

curl -s -X POST http://localhost:4000/connectors \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "id": "jira",
    "name": "Jira MCP Connector",
    "description": "Provides governed access to Jira issue search, read, create, comment, and transition operations.",
    "ownerTeam": "ai-platform",
    "businessDomain": "engineering",
    "connectorType": "issue_tracker",
    "version": "0.1.0",
    "status": "approved",
    "runtimeType": "managed",
    "authType": "api_token",
    "requiredScopes": ["read:jira-work", "write:jira-work"],
    "tools": [],
    "resources": [],
    "prompts": [],
    "riskLevel": "high",
    "dataClassification": "confidential"
  }'
```

## Request Project Access

```bash
curl -s -X POST http://localhost:4000/projects/ai-platform-demo/connectors/jira/request-access \
  -H "authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:4000/projects/ai-platform-demo/connectors/jira/approve-access \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{"accessLevel":"restricted"}'
```

The demo seed already grants `ai-platform-demo` approved restricted access to Jira so read tools work immediately.

## Invoke Through The Gateway

ADK and agent apps should call the MCP Gateway, not Jira directly:

```bash
DEV_TOKEN=$(curl -s -X POST http://localhost:4000/auth/dev-token \
  -H 'content-type: application/json' \
  -d '{"email":"developer@example.com"}' | jq -r .token)

curl -s -X POST http://localhost:4000/gateway/connectors/jira/tools/jira.search_issues/invoke \
  -H "authorization: Bearer $DEV_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "projectId": "ai-platform-demo",
    "input": {
      "jql": "project = DEMO ORDER BY created DESC",
      "maxResults": 10
    }
  }'
```

Write tools intentionally require approval:

```bash
curl -s -X POST http://localhost:4000/gateway/connectors/jira/tools/jira.create_issue/invoke \
  -H "authorization: Bearer $DEV_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "projectId": "ai-platform-demo",
    "input": {
      "projectKey": "DEMO",
      "summary": "Bug from incident",
      "description": "Created through governed MCP Gateway"
    }
  }'
```

Expected result: denied or requires approval, with an audit event.

## Audit Logs

```bash
AUDITOR_TOKEN=$(curl -s -X POST http://localhost:4000/auth/dev-token \
  -H 'content-type: application/json' \
  -d '{"email":"auditor@example.com"}' | jq -r .token)

curl -s http://localhost:4000/audit/events \
  -H "authorization: Bearer $AUDITOR_TOKEN"
```

## Add A New Tool

1. Add a file under `src/tools`.
2. Add validation with Zod.
3. Add a mock-mode implementation in `src/mockJira.ts` or `src/client.ts`.
4. Add a real-mode Jira REST call in `src/client.ts`.
5. Register the handler in `src/server.ts`.
6. Add tool metadata to `connector.yaml` and `registry/connectors/jira.yaml`.
7. Add tests.

## Security Checklist

- No raw Jira credentials in source.
- Use `JIRA_AUTH_MODE=mock` for local development.
- Store only secret references in platform metadata.
- Mark write tools with `requires_human_approval: true`.
- Route all calls through the MCP Gateway.
- Verify audit events for allowed and denied calls.
