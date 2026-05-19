import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { AuditEvent } from "@prisma/client";
import { sanitizeActorId, sanitizeAuditMetadata } from "../observability/sanitizer.js";
import { siemExportDuration, siemExportTotal, siemFailedRecordsTotal, siemLastExportTimestamp } from "../observability/metrics.js";

export type SiemExportMode = "local_jsonl" | "webhook_http" | "syslog_stub";

type ExportStatus = {
  mode: SiemExportMode;
  queued: number;
  exported: number;
  failed: number;
  lastExportedAt?: string;
  lastError?: string;
  path?: string;
};

const status: ExportStatus = {
  mode: (process.env.SIEM_EXPORT_MODE ?? "local_jsonl") as SiemExportMode,
  queued: 0,
  exported: 0,
  failed: 0,
  path: process.env.SIEM_EXPORT_PATH ?? "./audit-exports/audit-events.jsonl"
};

const queue: AuditEvent[] = [];
let running = false;

export function enqueueAuditExport(event: AuditEvent) {
  if (process.env.SIEM_EXPORT_MODE === "disabled") return;
  queue.push(event);
  status.queued = queue.length;
}

export function getSiemExportStatus() {
  return { ...status, queued: queue.length };
}

export async function runSiemExport() {
  if (running) return getSiemExportStatus();
  running = true;
  const batchSize = Number(process.env.SIEM_EXPORT_BATCH_SIZE ?? 100);
  const batch = queue.splice(0, batchSize);
  status.queued = queue.length;
  try {
    if (batch.length > 0) {
      const started = performance.now();
      await exportBatch(batch);
      const durationSeconds = (performance.now() - started) / 1000;
      status.exported += batch.length;
      status.lastExportedAt = new Date().toISOString();
      siemExportTotal.inc({ mode: status.mode, status: "success" }, batch.length);
      siemExportDuration.observe({ mode: status.mode, status: "success" }, durationSeconds);
      siemLastExportTimestamp.set({ mode: status.mode }, Date.now() / 1000);
    }
  } catch (error: any) {
    status.failed += batch.length;
    status.lastError = error.message;
    siemExportTotal.inc({ mode: status.mode, status: "failure" }, batch.length || 1);
    siemFailedRecordsTotal.inc({ mode: status.mode }, batch.length || 1);
    queue.unshift(...batch);
  } finally {
    running = false;
  }
  return getSiemExportStatus();
}

async function exportBatch(batch: AuditEvent[]) {
  if (status.mode === "local_jsonl") {
    const target = path.resolve(process.cwd(), process.env.SIEM_EXPORT_PATH ?? "./audit-exports/audit-events.jsonl");
    await fs.mkdir(path.dirname(target), { recursive: true });
    const lines = batch.map((event) => JSON.stringify(toSiemRecord(event))).join("\n") + "\n";
    await fs.appendFile(target, lines);
    status.path = target;
    return;
  }
  if (status.mode === "webhook_http") {
    const webhookUrl = process.env.SIEM_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("SIEM_WEBHOOK_URL is required for webhook_http mode");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: batch.map(toSiemRecord) })
    });
    if (!response.ok) throw new Error(`SIEM webhook export failed with ${response.status}`);
    return;
  }
  if (status.mode === "syslog_stub") {
    // Stub mode validates and counts records without network I/O.
    batch.map(toSiemRecord);
    return;
  }
}

export function toSiemRecord(event: AuditEvent) {
  const metadata = (event.metadata ?? {}) as Record<string, unknown>;
  return {
    id: event.id,
    timestamp: event.timestamp.toISOString(),
    trace_id: event.traceId,
    request_id: event.requestId,
    actor: {
      id: sanitizeActorId(event.actorId),
      type: event.actorType
    },
    project_id: event.projectId,
    connector_id: event.connectorId,
    skill_id: event.skillId,
    task_id: event.taskId,
    tool_name: event.toolName,
    action: event.action,
    decision: event.decision,
    reason_code: event.reasonCode,
    reason: event.reason,
    risk_level: event.riskLevel,
    data_classification: event.dataClassification,
    metadata: {
      gateway_version: "local-dev",
      connector_runtime: metadata.connectorRuntime ?? metadata.connector_runtime ?? "unknown",
      ...sanitizeAuditMetadata(metadata)
    }
  };
}

const intervalSeconds = Number(process.env.SIEM_EXPORT_INTERVAL_SECONDS ?? 30);
if (process.env.NODE_ENV !== "test" && process.env.SIEM_EXPORT_MODE !== "disabled") {
  setInterval(() => {
    runSiemExport().catch(() => undefined);
  }, Math.max(intervalSeconds, 1) * 1000).unref();
}
