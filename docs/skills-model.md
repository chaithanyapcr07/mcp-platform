# Skills Model

Skills are reusable governed capabilities composed from one or more connectors, tools, resources, and prompts. They are not MCP primitives. Skills add ownership, versioning, status, allowed capability lists, required permissions, approvals, policies, evals, and examples.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
