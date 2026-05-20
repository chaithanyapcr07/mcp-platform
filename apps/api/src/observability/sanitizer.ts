const secretPatterns = [
  /authorization/i,
  /token/i,
  /secret/i,
  /password/i,
  /api[_-]?key/i,
  /cookie/i,
  /prompt/i,
  /body/i,
  /description/i,
  /comment/i
];

const allowedAttributes = new Set([
  "request_id",
  "actor_id",
  "actor_type",
  "project_id",
  "connector_id",
  "skill_id",
  "task_id",
  "tool_name",
  "decision",
  "reason_code",
  "denial_reason",
  "risk_level",
  "data_classification",
  "status",
  "http.method",
  "http.route",
  "http.status_code",
  "connector_runtime",
  "gateway_version",
  "export_mode",
  "template_id"
]);

export function sanitizeActorId(actorId?: string) {
  if (!actorId) return undefined;
  return actorId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

export function safeReasonCode(reason?: string) {
  const normalized = (reason ?? "UNKNOWN").toUpperCase();
  if (normalized.includes("WRITE")) return "HIGH_RISK_WRITE_BLOCKED";
  if (normalized.includes("PROJECT") && normalized.includes("ACCESS")) return "PROJECT_ACCESS_DENIED";
  if (normalized.includes("RBAC") || normalized.includes("PERMISSION") || normalized.includes("LACKS")) return "RBAC_DENIED";
  if (normalized.includes("APPROVAL")) return "APPROVAL_REQUIRED";
  if (normalized.includes("STATUS")) return "CONNECTOR_STATUS_DENIED";
  if (normalized.includes("RESTRICTED")) return "RESTRICTED_DATA_DENIED";
  if (normalized.includes("ALLOWED")) return "POLICY_ALLOWED";
  return "POLICY_DENIED";
}

export function sanitizeTelemetryAttributes(input: Record<string, unknown> = {}) {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowedAttributes.has(key)) continue;
    if (secretPatterns.some((pattern) => pattern.test(key))) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string") safe[key] = value.slice(0, 160);
    else if (typeof value === "number" || typeof value === "boolean") safe[key] = value;
  }
  return safe;
}

export function sanitizeAuditMetadata(input: Record<string, unknown> = {}) {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (secretPatterns.some((pattern) => pattern.test(key))) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string") safe[key] = value.slice(0, 500);
    else if (typeof value === "number" || typeof value === "boolean") safe[key] = value;
    else if (Array.isArray(value)) safe[key] = value.slice(0, 20).map((entry) => String(entry).slice(0, 120));
    else safe[key] = "[redacted_object]";
  }
  return safe;
}
