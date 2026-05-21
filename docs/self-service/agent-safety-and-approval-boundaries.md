# Agent Safety And Approval Boundaries

The Self-Service Agent accelerates intake and orchestration. It does not approve itself, bypass policy, or call enterprise systems directly.

## Safety Rules

- Runtime tool calls go through MCP Gateway.
- High-risk write tools return `approval_required`.
- Existing connector access creates or reuses an access request.
- Missing connector onboarding starts Spec-Driven Development artifacts.
- Agent decisions write audit events.
- The agent response includes a request ID for traceability.
- The agent does not place raw secrets, tokens, Authorization headers, or sensitive request bodies in telemetry attributes.

## Write Actions

Write tools such as these require approval by default:

- `jira.create_issue`
- `jira.add_comment`
- `jira.transition_issue`
- `servicenow.create_incident`
- `servicenow.update_incident`

The gateway owns final enforcement. The agent can plan or request approval, but the gateway decides whether execution is allowed, denied, or approval-gated at runtime.
