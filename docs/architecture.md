# Platform Architecture

The platform is split into a control plane for registry, approval, RBAC, policy, projects, documentation, templates, and deployment status, and a data plane gateway for authenticated runtime execution. MCP-native tools, resources, and prompts live under connectors. Skills and Tasks are enterprise platform abstractions with schemas, policies, approvals, evals, and audit trails.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
