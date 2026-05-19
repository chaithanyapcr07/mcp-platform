import { nanoid } from "nanoid";
import { auditEventSchema, type AuditEventInput } from "@mcp-platform/shared-types";
import type { DbClient } from "../db/client.js";
import { activeTraceContext, withSpan } from "../observability/tracing.js";
import { recordAuditEvent } from "../observability/metrics.js";
import { safeReasonCode, sanitizeAuditMetadata } from "../observability/sanitizer.js";
import { enqueueAuditExport } from "./siem-exporter.js";

export async function writeAuditEvent(db: DbClient, input: AuditEventInput) {
  return withSpan("audit.write_event", {
    request_id: input.requestId,
    connector_id: input.connectorId,
    tool_name: input.toolName,
    decision: input.decision,
    reason_code: input.reasonCode ?? safeReasonCode(input.reason)
  }, async () => {
    const traceContext = activeTraceContext();
    const event = auditEventSchema.parse({
      ...input,
      reasonCode: input.reasonCode ?? safeReasonCode(input.reason),
      traceId: input.traceId ?? traceContext.traceId,
      spanId: input.spanId ?? traceContext.spanId,
      metadata: sanitizeAuditMetadata(input.metadata)
    });
    const created = await db.auditEvent.create({
      data: {
        id: nanoid(),
        actorId: event.actorId,
        actorType: event.actorType,
        teamId: event.teamId,
        projectId: event.projectId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        connectorId: event.connectorId,
        skillId: event.skillId,
        taskId: event.taskId,
        toolName: event.toolName,
        decision: event.decision,
        reason: event.reason,
        reasonCode: event.reasonCode,
        requestId: event.requestId,
        traceId: event.traceId,
        spanId: event.spanId,
        riskLevel: event.riskLevel,
        dataClassification: event.dataClassification,
        metadata: event.metadata
      }
    });
    recordAuditEvent({
      action: event.action,
      decision: event.decision,
      connectorId: event.connectorId,
      toolName: event.toolName,
      reasonCode: event.reasonCode
    });
    enqueueAuditExport(created);
    return created;
  });
}

export async function listAuditEvents(db: DbClient, query: { projectId?: string; requestId?: string; take?: number }) {
  return db.auditEvent.findMany({
    where: {
      projectId: query.projectId,
      requestId: query.requestId
    },
    orderBy: { timestamp: "desc" },
    take: query.take ?? 100
  });
}
