# Registry Model

The registry stores desired connector, skill, task, policy, approval, and eval definitions in Git and live runtime state in PostgreSQL.

Jira example:

- connector: `registry/connectors/jira.yaml`
- skill: `registry/skills/engineering-ticket-management.yaml`
- task: `registry/tasks/create-jira-ticket-from-incident.yaml`

```mermaid
flowchart TD
  Connector["jira connector"] --> Tools["jira.search_issues / jira.create_issue"]
  Skill["engineering-ticket-management skill"] --> Connector
  Task["create-jira-ticket-from-incident task"] --> Skill
  Policy["write tools require approval"] --> Task
```
