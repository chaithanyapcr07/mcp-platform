# Templates

Reusable onboarding templates for connectors, skills, and tasks.

## Connector Templates

Path: `connector/`

Use these when a team needs a new MCP connector:

- `generic-rest-api`
- `jira-like-issue-tracker`
- `github-like-code-host`
- `database-readonly`
- `document-retrieval`
- `internal-tool`
- `custom-team-owned`

Generate one from the repo root:

```bash
npm run connector:create -- --name my-rest-connector --template generic-rest-api
```

## Skill Templates

Path: `skill/`

Use these to model governed reusable capabilities on top of connectors:

- `read-only-enterprise-skill`
- `write-action-with-approval`
- `incident-response`
- `developer-productivity`

## Task Templates

Path: `task/`

Use these to model platform-owned workflow definitions:

- `approval-required-task`
- `read-only-summary-task`
- `incident-response-task`
- `software-delivery-task`

## Spec-Driven Connector Template

See [../docs/templates/spec-driven-connector-template.md](../docs/templates/spec-driven-connector-template.md) for the requirements/design/tasks artifacts expected from agent-assisted onboarding.
