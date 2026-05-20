# Agent-Assisted ServiceNow Onboarding

User request:

> I need my agent to use ServiceNow.

The onboarding agent does not jump straight to production code. It runs the SDD workflow:

1. Ask intake questions about tools, projects, data, write actions, and owners.
2. Check the registry for an existing ServiceNow connector.
3. Recommend reuse or new connector build.
4. Generate `requirements.md`, `design.md`, and `tasks.md`.
5. Generate `connector.yaml` and `policy.yaml`.
6. Generate a local connector repo under `generated-repos/servicenow-mcp-connector`.
7. Run local validation.
8. Create `registration-request.yaml` and `validation-report.md`.
9. Route the package to platform/security review.

Run:

```bash
npm run onboard:connector -- --system servicenow --owner-team service-management-platform --mode new-repo
```

Output:

```text
generated-repos/servicenow-mcp-connector/
```

