# API Reference

Core endpoints include /connectors, /skills, /tasks, /projects, /roles, /audit/events, /templates, /gateway/connectors/{connector_id}/tools/{tool_name}/invoke, /gateway/connectors/{connector_id}/health, and /gateway/tasks/{task_id}/execute.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
