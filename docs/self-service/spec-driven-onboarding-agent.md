# Spec-Driven Onboarding Agent

When a user says, "I need my agent to use ServiceNow," the onboarding agent follows Spec-Driven Development.

It must not generate production connector code directly from a vague request.

## Flow

1. Intake
2. Registry check
3. Reuse-or-build decision
4. `requirements.md` generation
5. `design.md` generation
6. `tasks.md` generation
7. `connector.yaml` generation
8. `policy.yaml` generation
9. repo scaffold generation
10. local validation
11. registration request generation
12. PR creation or review package creation
13. platform/security approval routing

## Generated Artifacts

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

## Guardrails

- Ask intake questions.
- Prefer existing approved connectors.
- Recommend templates for new connectors.
- Never auto-approve high-risk write tools.
- Never store raw secrets.
- Route production use to platform/security approval.

