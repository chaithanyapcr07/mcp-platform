# Agent-Assisted Onboarding

The onboarding agent accelerates intake, scaffolding, validation, and review package creation. It does not bypass governance.

Platform/security approval is still required for production use, restricted data, and high-risk write tools.

```mermaid
flowchart TD
  User["User request"] --> Agent["Onboarding agent"]
  Agent --> Req["requirements.md"]
  Req --> Design["design.md"]
  Design --> Tasks["tasks.md"]
  Tasks --> Scaffold["connector scaffold"]
  Scaffold --> Validate["local validation"]
  Validate --> Register["registration request"]
  Register --> Review["platform/security review"]
  Review --> Approved["approved connector"]
  Approved --> Gateway["MCP Gateway execution"]
```

The agent must ask intake questions, check the registry, recommend reuse or build, generate SDD artifacts, create a scaffold, run validation, and route the result to review.

