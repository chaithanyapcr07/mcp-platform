import type { FastifyInstance } from "fastify";
import { requireActor } from "../auth/auth.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { forbidden } from "../errors.js";
import { invokeRemoteConnector } from "../gateway/gateway.routes.js";
import { getConnectorManifest } from "../registry/registry.service.js";

function actor(request: any) {
  if (!request.actor) throw forbidden("Authenticated actor required");
  return request.actor;
}

function requireApprover(request: any) {
  const requestActor = actor(request);
  if (!requestActor.permissions.includes("connector:approve") && !requestActor.permissions.includes("policy:write") && !requestActor.roles.includes("security_reviewer")) {
    throw forbidden("Platform or security approver required");
  }
}

export async function registerApprovalRoutes(app: FastifyInstance) {
  app.get("/approvals", { preHandler: requireActor }, async (request: any) => {
    const query = request.query as { status?: string; resourceType?: string; take?: string };
    return app.db.approval.findMany({
      where: {
        status: query.status,
        resourceType: query.resourceType
      },
      orderBy: { createdAt: "desc" },
      take: query.take ? Number(query.take) : 100
    });
  });

  app.post("/approvals/:id/approve", { preHandler: requireActor }, async (request: any) => {
    requireApprover(request);
    const approval = await app.db.approval.update({
      where: { id: request.params.id },
      data: {
        status: "approved",
        reviewedBy: actor(request).id,
        reason: (request.body as { reason?: string } | undefined)?.reason ?? "Approved"
      }
    });
    await writeAuditEvent(app.db, {
      actorId: actor(request).id,
      actorType: "user",
      action: "approval.approve",
      resourceType: approval.resourceType,
      resourceId: approval.resourceId,
      decision: "allowed",
      reason: approval.reason ?? "Approval granted",
      requestId: request.id,
      metadata: { approvalId: approval.id }
    });
    return approval;
  });

  app.post("/approvals/:id/reject", { preHandler: requireActor }, async (request: any) => {
    requireApprover(request);
    const approval = await app.db.approval.update({
      where: { id: request.params.id },
      data: {
        status: "rejected",
        reviewedBy: actor(request).id,
        reason: (request.body as { reason?: string } | undefined)?.reason ?? "Rejected"
      }
    });
    await writeAuditEvent(app.db, {
      actorId: actor(request).id,
      actorType: "user",
      action: "approval.reject",
      resourceType: approval.resourceType,
      resourceId: approval.resourceId,
      decision: "denied",
      reason: approval.reason ?? "Approval rejected",
      requestId: request.id,
      metadata: { approvalId: approval.id }
    });
    return approval;
  });

  app.post("/approvals/:id/execute", { preHandler: requireActor }, async (request: any) => {
    const approval = await app.db.approval.findUniqueOrThrow({ where: { id: request.params.id } });
    const requestActor = actor(request);
    const canResume = approval.requestedBy === requestActor.id
      || approval.reviewedBy === requestActor.id
      || requestActor.permissions.includes("connector:approve")
      || requestActor.roles.includes("security_reviewer");
    if (!canResume) {
      throw forbidden("Only the requester, reviewer, or platform/security approver can resume approved execution");
    }
    if (approval.status !== "approved") {
      throw forbidden("Approval must be approved before execution can resume");
    }
    if (!approval.connectorId || !approval.toolName || !approval.projectId || !approval.input) {
      throw forbidden("Approval does not include executable gateway context");
    }
    const connector = await getConnectorManifest(app.db, approval.connectorId);
    const requestId = `${approval.requestId ?? request.id}:approved`;
    const startedAt = Date.now();
    const output = await invokeRemoteConnector(approval.connectorId, approval.toolName, approval.input as Record<string, unknown>, requestId);
    await app.db.approval.update({
      where: { id: approval.id },
      data: { status: "executed" }
    });
    await writeAuditEvent(app.db, {
      actorId: requestActor.id,
      actorType: "user",
      projectId: approval.projectId,
      action: "approval.execute",
      resourceType: approval.resourceType,
      resourceId: approval.resourceId,
      connectorId: approval.connectorId,
      toolName: approval.toolName,
      decision: "allowed",
      reason: "Approved tool execution resumed",
      reasonCode: "APPROVAL_EXECUTED",
      requestId,
      riskLevel: connector.riskLevel,
      dataClassification: connector.dataClassification,
      metadata: {
        approvalId: approval.id,
        reviewedBy: approval.reviewedBy,
        latencyMs: Date.now() - startedAt
      }
    });
    return {
      requestId,
      approvalId: approval.id,
      connectorId: approval.connectorId,
      toolName: approval.toolName,
      output
    };
  });
}
