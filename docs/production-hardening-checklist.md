# Production Hardening Checklist

- OIDC integration
- Enterprise IdP integration
- Vault integration
- Kubernetes deployment
- mTLS
- Network policies
- Egress controls
- Connector sandboxing
- Rate limiting
- OPA/Cedar integration
- OpenTelemetry
- SIEM audit export
- Approval workflows
- Vulnerability scanning
- SBOM generation
- Dependency scanning
- Container image signing
- Runtime isolation
- Secrets rotation
- Disaster recovery
- Multi-environment promotion
- Policy-as-code review
- Break-glass workflow
- Admin audit review

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
