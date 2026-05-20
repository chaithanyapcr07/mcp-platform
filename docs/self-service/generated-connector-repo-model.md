# Generated Connector Repo Model

Generated repos are owned by the connector-owning team unless AI Platform explicitly adopts the connector as a common platform-owned connector.

## Output Options

Option A: generate inside `examples/generated-connectors/`.

Option B: generate a standalone connector repo folder under `generated-repos/`.

Option C: create a GitHub repo when `GITHUB_TOKEN` and `GITHUB_ORG` are configured.

Local generation works without network access or GitHub credentials.

## Required Files

- requirements.md
- design.md
- tasks.md
- connector.yaml
- policy.yaml
- README.md
- .env.example
- Dockerfile
- src/server.ts
- src/tools/
- src/resources/
- src/prompts/
- src/auth/
- tests/
- validation-report.md
- registration-request.yaml

