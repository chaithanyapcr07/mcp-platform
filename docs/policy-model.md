# Policy Model

The MVP uses an internal TypeScript evaluator that can later be replaced by OPA, Cedar, or another enterprise engine. It denies disabled or unapproved assets, missing project access, missing execute permissions, restricted data without explicit approval, and write tools without write access.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
