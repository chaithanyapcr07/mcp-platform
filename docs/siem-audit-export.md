# SIEM Audit Export

Audit export is implemented in `apps/api/src/audit/siem-exporter.ts`. It runs asynchronously so a failed SIEM export does not block gateway execution.

## Modes

Supported MVP modes:

- `local_jsonl`: writes sanitized audit records to a local JSONL file.
- `webhook_http`: posts batches to a configured webhook URL.
- `syslog_stub`: validates and counts records through the export interface without network I/O.

Environment variables:

```bash
SIEM_EXPORT_MODE=local_jsonl
SIEM_EXPORT_PATH=./audit-exports/audit-events.jsonl
SIEM_WEBHOOK_URL=
SIEM_EXPORT_BATCH_SIZE=100
SIEM_EXPORT_INTERVAL_SECONDS=30
```

Docker Compose sets:

```bash
SIEM_EXPORT_MODE=local_jsonl
SIEM_EXPORT_PATH=/app/audit-exports/audit-events.jsonl
SIEM_EXPORT_INTERVAL_SECONDS=5
```

## Schema

Exported records use this safe schema:

```json
{
  "id": "audit_event_id",
  "timestamp": "2026-05-19T00:00:00.000Z",
  "trace_id": "otel_trace_id",
  "request_id": "request_id",
  "actor": {
    "id": "sanitized_actor_id",
    "type": "user"
  },
  "project_id": "ai-platform-demo",
  "connector_id": "jira",
  "skill_id": "engineering-ticket-management",
  "task_id": "create-jira-ticket-from-incident",
  "tool_name": "jira.search_issues",
  "action": "tool.invoke",
  "decision": "allowed",
  "reason_code": "POLICY_ALLOWED",
  "reason": "safe human-readable reason",
  "risk_level": "high",
  "data_classification": "confidential",
  "metadata": {
    "gateway_version": "local-dev",
    "connector_runtime": "managed"
  }
}
```

The exporter excludes raw secrets, Jira API tokens, authorization headers, cookies, raw request bodies, descriptions, comments, and prompt text. Metadata is sanitized by `apps/api/src/observability/sanitizer.ts`.

## API

Run export immediately:

```bash
curl -s -X POST http://localhost:4000/audit/export/run \
  -H "authorization: Bearer $AUDITOR_TOKEN"
```

Check status:

```bash
curl -s http://localhost:4000/audit/export/status \
  -H "authorization: Bearer $AUDITOR_TOKEN"
```

Query audit events:

```bash
curl -s http://localhost:4000/audit/events \
  -H "authorization: Bearer $AUDITOR_TOKEN"
```

## Metrics

SIEM export emits:

- `mcp_siem_export_total`
- `mcp_siem_export_duration_seconds`
- `mcp_siem_last_export_timestamp_seconds`
- `mcp_siem_failed_records_total`

Webhook failures increment failure counters and requeue the batch. Gateway requests still complete because export is non-blocking.

## Future SIEM Integrations

The same schema can be forwarded to:

- Splunk through HTTP Event Collector
- Microsoft Sentinel through an HTTP data collector endpoint
- Datadog Logs intake
- Elastic through Beats or HTTP ingestion
- Syslog-compatible collectors

For production, pair this exporter with durable queuing, backpressure limits, dead-letter storage, and SIEM delivery alerts.
