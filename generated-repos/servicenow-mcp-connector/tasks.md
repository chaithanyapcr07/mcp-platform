# Servicenow MCP Connector Tasks

## Implementation Tasks

- Implement mock and real ServiceNow adapters.
- Implement search, get, create, and update tools.
- Implement incident resource and triage prompt.
- Add safe error mapping and input validation.

## Test Tasks

- Unit test tool handlers.
- Test write tools are approval_required in policy.
- Test mock mode without credentials.
- Test manifest and registration request fields.

## Security Review Tasks

- Confirm no raw secrets are committed.
- Confirm confidential classification.
- Confirm high-risk write action approval policy.
- Confirm telemetry sanitizer excludes tokens and raw incident bodies.

## Documentation Tasks

- Document env vars, local run, gateway invocation, support channel, and ownership.

## Registration Tasks

- Submit connector.yaml and registration-request.yaml.
- Route to platform and security review.

## Deployment Tasks

- Deploy to dev, staging, then prod after approvals.
- Configure runtime_url and health checks per environment.

## Approval Tasks

- Approve connector registration.
- Approve project access.
- Approve or deny write-tool automation policy.
