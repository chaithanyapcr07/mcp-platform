import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "mcp_platform_" });

const commonLabelNames = ["connector_id", "tool_name", "decision", "reason_code", "status", "risk_level", "data_classification"] as const;

function labels(input: Record<string, string | undefined> = {}) {
  return {
    connector_id: input.connector_id ?? input.connectorId ?? "none",
    tool_name: input.tool_name ?? input.toolName ?? "none",
    decision: input.decision ?? "none",
    reason_code: input.reason_code ?? input.reasonCode ?? "none",
    status: input.status ?? "none",
    risk_level: input.risk_level ?? input.riskLevel ?? "none",
    data_classification: input.data_classification ?? input.dataClassification ?? "none"
  };
}

export const gatewayRequestsTotal = new client.Counter({
  name: "mcp_gateway_requests_total",
  help: "Total MCP gateway requests.",
  labelNames: commonLabelNames,
  registers: [register]
});

export const gatewayRequestDuration = new client.Histogram({
  name: "mcp_gateway_request_duration_seconds",
  help: "MCP gateway request duration in seconds.",
  labelNames: commonLabelNames,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register]
});

export const toolInvocationsTotal = new client.Counter({
  name: "mcp_tool_invocations_total",
  help: "Total connector tool invocations.",
  labelNames: commonLabelNames,
  registers: [register]
});

export const toolInvocationDuration = new client.Histogram({
  name: "mcp_tool_invocation_duration_seconds",
  help: "Connector tool invocation duration in seconds.",
  labelNames: commonLabelNames,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register]
});

export const toolInvocationErrorsTotal = new client.Counter({
  name: "mcp_tool_invocation_errors_total",
  help: "Total connector tool invocation errors.",
  labelNames: commonLabelNames,
  registers: [register]
});

export const policyDecisionsTotal = new client.Counter({
  name: "mcp_policy_decisions_total",
  help: "Total policy decisions.",
  labelNames: commonLabelNames,
  registers: [register]
});

export const policyDenialsTotal = new client.Counter({
  name: "mcp_policy_denials_total",
  help: "Total policy denials.",
  labelNames: commonLabelNames,
  registers: [register]
});

export const rbacChecksTotal = new client.Counter({
  name: "mcp_rbac_checks_total",
  help: "Total RBAC checks.",
  labelNames: ["permission", "decision", "reason_code"],
  registers: [register]
});

export const rbacDenialsTotal = new client.Counter({
  name: "mcp_rbac_denials_total",
  help: "Total RBAC denials.",
  labelNames: ["permission", "reason_code"],
  registers: [register]
});

export const authFailuresTotal = new client.Counter({
  name: "mcp_auth_failures_total",
  help: "Total authentication failures.",
  labelNames: ["reason_code"],
  registers: [register]
});

export const connectorHealthStatus = new client.Gauge({
  name: "mcp_connector_health_status",
  help: "Connector health status where 1 is healthy and 0 is unhealthy.",
  labelNames: ["connector_id", "status"],
  registers: [register]
});

export const connectorErrorsTotal = new client.Counter({
  name: "mcp_connector_errors_total",
  help: "Total connector runtime errors.",
  labelNames: commonLabelNames,
  registers: [register]
});

export const auditEventsTotal = new client.Counter({
  name: "mcp_audit_events_total",
  help: "Total audit events written.",
  labelNames: ["action", "decision", "connector_id", "tool_name", "reason_code"],
  registers: [register]
});

export const templateGenerationsTotal = new client.Counter({
  name: "mcp_template_generations_total",
  help: "Total template generations.",
  labelNames: ["template_id", "status"],
  registers: [register]
});

export const taskExecutionsTotal = new client.Counter({
  name: "mcp_task_executions_total",
  help: "Total task executions.",
  labelNames: commonLabelNames,
  registers: [register]
});

export const taskExecutionDuration = new client.Histogram({
  name: "mcp_task_execution_duration_seconds",
  help: "Task execution duration in seconds.",
  labelNames: commonLabelNames,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register]
});

export const policyEvaluationDuration = new client.Histogram({
  name: "mcp_policy_evaluation_duration_seconds",
  help: "Policy evaluation duration in seconds.",
  labelNames: commonLabelNames,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
  registers: [register]
});

export const siemExportTotal = new client.Counter({
  name: "mcp_siem_export_total",
  help: "Total SIEM export results.",
  labelNames: ["mode", "status"],
  registers: [register]
});

export const siemExportDuration = new client.Histogram({
  name: "mcp_siem_export_duration_seconds",
  help: "SIEM export duration in seconds.",
  labelNames: ["mode", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register]
});

export const siemLastExportTimestamp = new client.Gauge({
  name: "mcp_siem_last_export_timestamp_seconds",
  help: "Unix timestamp for the last successful SIEM export.",
  labelNames: ["mode"],
  registers: [register]
});

export const siemFailedRecordsTotal = new client.Counter({
  name: "mcp_siem_failed_records_total",
  help: "Total failed SIEM export records.",
  labelNames: ["mode"],
  registers: [register]
});

export function recordGatewayRequest(input: Record<string, string | undefined>, durationSeconds: number) {
  const safe = labels(input);
  gatewayRequestsTotal.inc(safe);
  gatewayRequestDuration.observe(safe, durationSeconds);
}

export function recordToolInvocation(input: Record<string, string | undefined>, durationSeconds: number) {
  const safe = labels(input);
  toolInvocationsTotal.inc(safe);
  toolInvocationDuration.observe(safe, durationSeconds);
}

export function recordToolError(input: Record<string, string | undefined>) {
  const safe = labels(input);
  toolInvocationErrorsTotal.inc(safe);
  connectorErrorsTotal.inc(safe);
}

export function recordPolicyDecision(input: Record<string, string | undefined>, durationSeconds = 0) {
  const safe = labels(input);
  policyDecisionsTotal.inc(safe);
  if (safe.decision === "denied") policyDenialsTotal.inc(safe);
  policyEvaluationDuration.observe(safe, durationSeconds);
}

export function recordAuditEvent(input: { action: string; decision: string; connectorId?: string; toolName?: string; reasonCode?: string }) {
  auditEventsTotal.inc({
    action: input.action,
    decision: input.decision,
    connector_id: input.connectorId ?? "none",
    tool_name: input.toolName ?? "none",
    reason_code: input.reasonCode ?? "none"
  });
}

export function incrementMetric(name: string, rawLabels: Record<string, string> = {}) {
  if (name === "policy_denial_count") policyDenialsTotal.inc(labels(rawLabels));
  else if (name === "connector_execution_count") toolInvocationsTotal.inc(labels(rawLabels));
  else if (name === "connector_error_count") connectorErrorsTotal.inc(labels(rawLabels));
  else if (name === "task_execution_count") taskExecutionsTotal.inc(labels(rawLabels));
  else if (name === "task_error_count") connectorErrorsTotal.inc(labels(rawLabels));
}

export async function prometheusMetrics() {
  return register.metrics();
}

export function prometheusContentType() {
  return register.contentType;
}

export function getMetricsSnapshot() {
  return { prometheus: "/metrics" };
}
