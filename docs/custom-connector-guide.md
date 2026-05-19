# Custom Connector Guide

Start from the generator unless you have a strong reason not to.

```bash
npm run create:connector -- --name my-team-connector --template custom-team-owned
```

## Required Runtime Endpoints

Connector runtimes should expose:

- `GET /health`
- `GET /manifest`
- `POST /tools/{toolName}/invoke`

The MCP Gateway calls the connector runtime after auth, RBAC, project access, and policy checks.

## Required Files

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

## Add A Tool

1. Add input validation.
2. Implement mock/local behavior.
3. Implement real adapter behavior.
4. Register the route handler.
5. Add tool metadata to `connector.yaml`.
6. Add registry metadata.
7. Add tests.
8. Verify allowed and denied audit events.

## Reference Implementation

Use `connectors/jira` as the reference for:

- mock mode
- real API-token mode
- read and write tools
- resource and prompt declarations
- gateway invocation examples
- security checklist
