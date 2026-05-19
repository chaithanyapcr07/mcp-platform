# Operating Model

AI Platform owns the platform, security reviewers approve high-risk or restricted workflows, connector and skill owners maintain manifests, project admins request and approve access, and auditors query runtime accountability trails.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
