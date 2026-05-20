import type { FastifyInstance } from "fastify";
import { requireActor } from "../auth/auth.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { forbidden } from "../errors.js";

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
}

