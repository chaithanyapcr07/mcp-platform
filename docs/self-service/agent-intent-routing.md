# Agent Intent Routing

The local MVP uses deterministic rules. This keeps the starter kit runnable without LLM keys and makes governance behavior easy to test.

## Routing Rules

| Phrase pattern | Intent | Mapping |
|---|---|---|
| `search jira` / `jira issues` | `connector_tool_execution` | `jira.search_issues` |
| `create ServiceNow ticket` | `connector_tool_execution` | `servicenow.create_incident` |
| `create Jira issue` | `connector_tool_execution` | `jira.create_issue` |
| `access` plus connector name | `existing_connector_access_request` | Connector access request |
| `onboard` plus connector name | Reuse existing or start SDD | Registry resolver decides |
| `generate connector repo` | `generated_connector_repo_request` | Repo generation request |
| `registry` / `catalog` | `registry_lookup` | Registry lookup |

The code is structured behind an `AgentPlannerProvider` interface:

- `RuleBasedPlannerProvider`: local deterministic MVP
- `LlmPlannerProvider`: placeholder for future planner integration

Future LLM planners must produce the same typed plan and must still route execution through MCP Gateway.
