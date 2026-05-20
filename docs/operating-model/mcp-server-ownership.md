# MCP Server Ownership

## Ownership Principles

Every MCP connector must have a clear owner before production use.

AI Platform owns common platform connectors and governance controls. Domain teams own custom connectors and remote runtimes for their systems.

## AI Platform Owns

- MCP Gateway
- registry
- RBAC/policy engine
- audit pipeline
- observability dashboards
- connector templates
- platform-owned connectors
- onboarding agent framework
- generated repo templates
- connector runtime contract

## Connector Owner Owns

- generated connector repo
- connector implementation
- connector runtime if remote
- tool schema correctness
- connector-specific tests
- upstream API changes
- connector documentation
- runtime SLO if team-owned
- production support for team-owned connector

## Security Reviewer Owns

- data classification review
- high-risk write tool review
- secrets handling review
- approval policy review
- audit/SIEM requirements

## Project Team Owns

- access request justification
- correct use of approved tools
- ADK/MDK app behavior
- human approval compliance

