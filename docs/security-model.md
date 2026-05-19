# Security Model

Runtime execution requires authentication, project access, RBAC permissions, connector status checks, skill and task status checks, tool-level authorization, policy evaluation, rate limiting, secret references, and audit events. Raw secrets are never stored in source or database.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
