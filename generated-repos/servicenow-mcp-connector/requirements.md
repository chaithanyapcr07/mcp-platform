# Servicenow MCP Connector Requirements

## Business Goal

Enable approved ADK/MDK agents to search, read, create, and update ServiceNow incidents through the governed MCP Gateway.

## Target System

ServiceNow incident management API.

## Users And Personas

- DS / agent developer: consumes approved tools from an agent.
- Connector owner: service-management-platform owns implementation and runtime support.
- Security reviewer: reviews confidential incident data and write actions.
- Platform admin: registers, routes, monitors, and audits gateway usage.

## Allowed Tools

- servicenow.search_incidents
- servicenow.get_incident
- servicenow.create_incident
- servicenow.update_incident

## Denied Tools

- Direct credential access
- User or identity administration
- Bulk delete or destructive incident operations
- Unbounded export of restricted incident content

## Read/Write Intent

Read operations are allowed after project access approval. Write operations require explicit human approval unless a production policy grants automation for a narrow use case.

## Data Classification

confidential

## Auth Method

API token by secret reference in production; mock mode for local development.

## Secrets Required

- SERVICENOW_BASE_URL
- SERVICENOW_API_TOKEN

## Approval Requirements

High-risk write tools require platform/security review and human approval by default.

## Audit Requirements

All allowed and denied tool calls must produce audit events with request_id, trace_id, actor, project_id, connector_id, tool_name, decision, and reason_code.

## Observability Requirements

Gateway and connector requests must emit OpenTelemetry spans and Prometheus metrics without secrets or raw incident payloads.

## Acceptance Criteria

- Connector runs in mock mode locally.
- Manifest validates.
- Write tools are approval_required by default.
- Gateway invocation produces audit, metrics, and traces.
- Registration request identifies owner_team, runtime_owner, security_reviewer, deployment_mode, data_classification, and requested_tools.
