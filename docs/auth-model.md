# Authentication Model

Local development uses signed mock JWTs minted from seeded users. Business logic consumes an AuthenticatedActor abstraction, so OIDC, SAML, Okta, Entra ID, Google Workspace, service JWT, workload identity, or mTLS can replace the provider.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
