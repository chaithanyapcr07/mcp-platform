# MCP Connector Runtime Contract

Every production connector runtime must expose these capabilities.

## Required Capabilities

- health check
- manifest discovery
- tool discovery
- resource discovery
- prompt discovery
- invoke tool
- metrics
- audit correlation
- trace propagation
- safe error responses

## Deployment Modes

managed:
Platform deploys and operates connector runtime.

remote:
Domain team deploys and operates connector runtime; platform gateway routes to it.

sidecar:
Connector runs beside agent/app runtime; limited use.

embedded:
Connector runs inside app process; local/dev only unless explicitly approved.

external:
Third-party hosted MCP server; requires strict review.

## Safe Error Shape

Connector errors should include stable error codes and safe reasons. They must not include secrets, raw tokens, Authorization headers, or sensitive payloads.

