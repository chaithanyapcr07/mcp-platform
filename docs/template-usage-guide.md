# Template Usage Guide

This platform is template-first. The fastest onboarding path for a new team is:

1. Pick a connector template.
2. Generate a connector scaffold.
3. Implement or adapt tools.
4. Review `connector.yaml`.
5. Register the connector.
6. Request project access.
7. Invoke through the MCP Gateway.
8. Check audit logs.

## Connector Templates

- `generic-rest-api`
- `jira-like-issue-tracker`
- `github-like-code-host`
- `database-readonly`
- `document-retrieval`
- `internal-tool`
- `custom-team-owned`

Generate:

```bash
npm run create:connector -- --name my-jira-connector --template jira-like-issue-tracker
npm run create:connector -- --name my-rest-connector --template generic-rest-api
npm run create:connector -- --name my-docs-connector --template document-retrieval
```

Each generated connector includes:

- `connector.yaml`
- `README.md`
- `.env.example`
- `Dockerfile`
- `src/server.ts`
- `src/tools/`
- `src/resources/`
- `src/prompts/`
- `src/auth/`
- `tests/`
- `fixtures/sample-request.json`

## API Template Gallery

```bash
curl -s http://localhost:4000/templates \
  -H "authorization: Bearer $TOKEN"
```

Generate metadata through the API:

```bash
curl -s -X POST http://localhost:4000/templates/jira-like-issue-tracker/generate \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{"name":"team-jira-connector","ownerTeam":"payments-platform"}'
```

## Recommended First Template

Use `jira-like-issue-tracker` when your system has:

- issue search
- issue read
- issue creation
- comments
- status transitions
- read/write risk differences
- project-level access requirements

The production example is `connectors/jira`.
