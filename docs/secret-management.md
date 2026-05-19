# Secret Management

Connectors reference secret_ref, secret_provider, secret_version, allowed_runtime_identity, rotation_status, and last_rotated_at. The MVP mock provider resolves references only for the allowed runtime identity.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
