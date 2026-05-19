# RBAC Model

Roles include platform_admin, security_reviewer, connector_owner, connector_developer, skill_owner, skill_developer, task_owner, task_developer, project_admin, project_developer, connector_consumer, skill_consumer, task_executor, and auditor. Permissions are stored independently and assigned through roles.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
