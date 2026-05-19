import { nanoid } from "nanoid";
import { auditEventSchema, type AuditEventInput } from "@mcp-platform/shared-types";
import type { DbClient } from "../db/client.js";

export async function writeAuditEvent(db: DbClient, input: AuditEventInput) {
  const event = auditEventSchema.parse(input);
  return db.auditEvent.create({
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
      requestId: event.requestId,
      metadata: event.metadata
    }
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
