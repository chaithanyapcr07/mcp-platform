import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prometheusMetrics, recordGatewayRequest, recordPolicyDecision } from "../src/observability/metrics.js";
import { sanitizeAuditMetadata, sanitizeTelemetryAttributes } from "../src/observability/sanitizer.js";

const originalEnv = { ...process.env };

function auditEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "audit-1",
    timestamp: new Date("2026-05-19T00:00:00.000Z"),
    actorId: "developer@example.com",
    actorType: "user",
    teamId: null,
    projectId: "ai-platform-demo",
    action: "tool.invoke",
    resourceType: "tool",
    resourceId: "jira.jira.search_issues",
    connectorId: "jira",
    skillId: "engineering-ticket-management",
    taskId: null,
    toolName: "jira.search_issues",
    decision: "allowed",
    reason: "Tool invocation allowed and completed",
    reasonCode: "POLICY_ALLOWED",
    requestId: "req-1",
    traceId: "trace-1",
    spanId: "span-1",
    riskLevel: "high",
    dataClassification: "confidential",
    metadata: { connectorRuntime: "mock", apiToken: "must-not-leak" },
    ...overrides
  } as any;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe("observability controls", () => {
  it("metrics endpoint payload uses Prometheus format", async () => {
    const output = await prometheusMetrics();
    expect(output).toContain("# HELP mcp_gateway_requests_total");
  });

  it("observability config initializes tracing and metrics hooks", async () => {
    vi.resetModules();
    process.env.TRACING_ENABLED = "true";
    process.env.METRICS_ENABLED = "true";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";
    const { observabilityConfig } = await import("../src/observability/tracing.js");
    expect(observabilityConfig()).toMatchObject({
      tracingEnabled: true,
      metricsEnabled: true,
      otelCollectorEndpoint: "http://localhost:4318"
    });
  });

  it("gateway allowed and denied decisions increment counters", async () => {
    recordGatewayRequest({
      connectorId: "jira",
      toolName: "jira.search_issues",
      decision: "allowed",
      reasonCode: "POLICY_ALLOWED",
      status: "success",
      riskLevel: "high",
      dataClassification: "confidential"
    }, 0.02);
    recordPolicyDecision({
      connectorId: "jira",
      toolName: "jira.create_issue",
      decision: "denied",
      reasonCode: "APPROVAL_REQUIRED",
      riskLevel: "high",
      dataClassification: "confidential"
    }, 0.01);

    const output = await prometheusMetrics();
    expect(output).toContain('mcp_gateway_requests_total{connector_id="jira",tool_name="jira.search_issues",decision="allowed"');
    expect(output).toContain('mcp_policy_denials_total{connector_id="jira",tool_name="jira.create_issue",decision="denied",reason_code="APPROVAL_REQUIRED"');
  });

  it("audit export record includes trace_id and request_id", async () => {
    vi.resetModules();
    const { toSiemRecord } = await import("../src/audit/siem-exporter.js");
    const record = toSiemRecord(auditEvent());
    expect(record.trace_id).toBe("trace-1");
    expect(record.request_id).toBe("req-1");
    expect(JSON.stringify(record)).not.toContain("must-not-leak");
  });

  it("SIEM local_jsonl export writes a sanitized audit event", async () => {
    vi.resetModules();
    const target = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "mcp-audit-")), "audit-events.jsonl");
    process.env.SIEM_EXPORT_MODE = "local_jsonl";
    process.env.SIEM_EXPORT_PATH = target;
    process.env.SIEM_EXPORT_INTERVAL_SECONDS = "9999";

    const { enqueueAuditExport, runSiemExport } = await import("../src/audit/siem-exporter.js");
    enqueueAuditExport(auditEvent());
    const status = await runSiemExport();
    const output = await fs.readFile(target, "utf8");

    expect(status.exported).toBeGreaterThan(0);
    expect(output).toContain('"connector_id":"jira"');
    expect(output).toContain('"trace_id":"trace-1"');
    expect(output).not.toContain("must-not-leak");
  });

  it("SIEM webhook failure does not throw to gateway callers", async () => {
    vi.resetModules();
    process.env.SIEM_EXPORT_MODE = "webhook_http";
    process.env.SIEM_WEBHOOK_URL = "http://siem.example.invalid/events";
    process.env.SIEM_EXPORT_INTERVAL_SECONDS = "9999";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })));

    const { enqueueAuditExport, runSiemExport } = await import("../src/audit/siem-exporter.js");
    enqueueAuditExport(auditEvent());
    const status = await runSiemExport();

    expect(status.failed).toBeGreaterThan(0);
    expect(status.lastError).toContain("503");
  });

  it("telemetry sanitizer removes secrets and authorization headers", () => {
    const attrs = sanitizeTelemetryAttributes({
      request_id: "req-1",
      connector_id: "jira",
      authorization: "Bearer token",
      api_token: "secret",
      body: { jql: "project = DEMO" }
    });
    const metadata = sanitizeAuditMetadata({
      connectorRuntime: "mock",
      Authorization: "Bearer token",
      comment: "sensitive comment",
      apiKey: "secret"
    });

    expect(attrs).toEqual({ request_id: "req-1", connector_id: "jira" });
    expect(JSON.stringify(metadata)).toContain("connectorRuntime");
    expect(JSON.stringify(metadata)).not.toContain("Bearer token");
    expect(JSON.stringify(metadata)).not.toContain("secret");
    expect(JSON.stringify(metadata)).not.toContain("sensitive comment");
  });
});
