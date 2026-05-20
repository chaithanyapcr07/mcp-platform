# Generated Repos

This folder is for local connector repo generation during self-service onboarding demos.

Generated connector repos are examples of what a domain team would own outside the central platform repo in a real enterprise setup.

## Generate A Repo

From the repo root:

```bash
npm run connector:create-repo -- --name servicenow-mcp-connector --template generic-rest-api --owner-team service-management-platform
```

## Expected Output

A generated connector repo should include:

- `requirements.md`
- `design.md`
- `tasks.md`
- `connector.yaml`
- `policy.yaml`
- `README.md`
- `.env.example`
- `Dockerfile`
- `src/server.ts`
- `src/tools/`
- `src/resources/`
- `src/prompts/`
- `src/auth/`
- `tests/`
- `validation-report.md`
- `registration-request.yaml`

## Ownership

AI Platform owns the template and runtime contract. The connector-owning team owns the generated repo, implementation, tests, docs, and runtime if deployed remotely.
