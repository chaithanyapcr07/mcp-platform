# Self-Service Onboarding Model

The platform supports two self-service outputs.

## Existing Connector Access

Example: "I need Jira access for my incident-response agent."

The platform creates:

- access request
- project/tool permission request
- approval workflow
- audit trail

No new connector repo is needed.

## New Connector Repo

Example: "I need my agent to use ServiceNow."

The platform creates:

- generated connector repo or local folder
- requirements.md
- design.md
- tasks.md
- connector.yaml
- policy.yaml
- .env.example
- tool stubs
- tests
- README
- registration request
- validation report

## Entry Points

- Portal form
- CLI
- Onboarding agent

## Portal And API Roadmap

The same self-service model should be exposed through:

1. Portal form: users request existing connector access or propose a new connector.
2. CLI: users generate access requests and connector repos locally.
3. Onboarding agent: users ask natural language questions such as "I need my agent to use ServiceNow."

Future API endpoints should persist request state, attach generated artifacts, route approvals, and publish audit events for every state transition.
