import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireActor } from "../auth/auth.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { forbidden } from "../errors.js";

function actor(request: any) {
  if (!request.actor) throw forbidden("Authenticated actor required");
  return request.actor;
}

function requireReviewer(request: any) {
  const requestActor = actor(request);
  if (!requestActor.permissions.includes("registry:write") && !requestActor.permissions.includes("connector:approve") && !requestActor.roles.includes("security_reviewer")) {
    throw forbidden("Platform or security reviewer required");
  }
}

const accessRequestSchema = z.object({
  projectId: z.string().min(1),
  connectorId: z.string().min(1),
  requestedTools: z.array(z.string().min(1)).min(1),
  team: z.string().min(1).default("unknown"),
  readOrWriteIntent: z.enum(["read", "write", "read_write"]).default("read"),
  businessJustification: z.string().min(1),
  dataClassification: z.enum(["public", "internal", "confidential", "restricted"]).default("internal"),
  expectedVolume: z.string().optional(),
  approvers: z.array(z.string()).default(["ai-platform"]),
  source: z.enum(["portal", "cli", "agent"]).default("portal")
});

const connectorRequestSchema = z.object({
  projectId: z.string().min(1).optional(),
  desiredSystem: z.string().min(1),
  connectorId: z.string().min(1).optional(),
  requestedTools: z.array(z.string().min(1)).min(1),
  team: z.string().min(1),
  ownerTeam: z.string().min(1),
  runtimeOwner: z.string().min(1),
  securityReviewer: z.string().min(1).default("security-platform"),
  deploymentMode: z.enum(["managed", "remote", "sidecar", "embedded", "external"]).default("remote"),
  readOrWriteIntent: z.enum(["read", "write", "read_write"]).default("read"),
  businessJustification: z.string().min(1),
  dataClassification: z.enum(["public", "internal", "confidential", "restricted"]).default("internal"),
  expectedVolume: z.string().optional(),
  approvers: z.array(z.string()).default(["ai-platform", "security-platform"]),
  source: z.enum(["portal", "cli", "agent"]).default("portal")
});

const commentSchema = z.object({ body: z.string().min(1) });
const decisionSchema = z.object({ reason: z.string().min(1).optional() });

function sddArtifactTemplates(system: string) {
  return [
    {
      name: "requirements.md",
      kind: "sdd_requirements",
      content: `# ${system} Requirements\n\nCapture business goal, users, tools, data classification, approvals, audit, observability, and acceptance criteria.\n`
    },
    {
      name: "design.md",
      kind: "sdd_design",
      content: `# ${system} Design\n\nDescribe connector architecture, gateway interaction, policy enforcement, runtime mode, telemetry, failure modes, ownership, and sequence diagram.\n`
    },
    {
      name: "tasks.md",
      kind: "sdd_tasks",
      content: `# ${system} Tasks\n\nTrack implementation, tests, security review, documentation, registration, deployment, and approval tasks.\n`
    },
    {
      name: "registration-request.yaml",
      kind: "registration_request",
      content: `desired_system: ${system}\nstatus: draft\n`
    }
  ];
}

async function auditSelfService(app: FastifyInstance, request: any, action: string, requestId: string, reason: string) {
  await writeAuditEvent(app.db, {
    actorId: actor(request).id,
    actorType: "user",
    projectId: request.body?.projectId,
    action,
    resourceType: "self_service_request",
    resourceId: requestId,
    decision: "allowed",
    reason,
    requestId: request.id,
    metadata: {}
  });
}

export async function registerSelfServiceRoutes(app: FastifyInstance) {
  app.get("/self-service/requests", { preHandler: requireActor }, async (request: any) => {
    const query = request.query as { status?: string; projectId?: string; connectorId?: string; desiredSystem?: string; take?: string };
    return app.db.selfServiceRequest.findMany({
      where: {
        status: query.status,
        projectId: query.projectId,
        connectorId: query.connectorId,
        desiredSystem: query.desiredSystem
      },
      include: { artifacts: true, approvalSteps: true, comments: true },
      orderBy: { createdAt: "desc" },
      take: query.take ? Number(query.take) : 100
    });
  });

  app.get("/self-service/requests/:id", { preHandler: requireActor }, async (request: any) => {
    return app.db.selfServiceRequest.findUniqueOrThrow({
      where: { id: request.params.id },
      include: { artifacts: true, approvalSteps: true, comments: true }
    });
  });

  app.post("/self-service/access-requests", { preHandler: requireActor }, async (request: any) => {
    const body = accessRequestSchema.parse(request.body);
    const created = await app.db.selfServiceRequest.create({
      data: {
        id: nanoid(),
        type: "existing_connector_access",
        source: body.source,
        status: "requested",
        requesterId: actor(request).id,
        projectId: body.projectId,
        team: body.team,
        connectorId: body.connectorId,
        requestedTools: body.requestedTools,
        readOrWriteIntent: body.readOrWriteIntent,
        businessJustification: body.businessJustification,
        dataClassification: body.dataClassification,
        expectedVolume: body.expectedVolume,
        approvalRequired: true,
        approvers: body.approvers,
        metadata: {}
      }
    });
    await app.db.connectorAccessRequest.upsert({
      where: { projectId_connectorId: { projectId: body.projectId, connectorId: body.connectorId } },
      update: { status: "pending", requestedBy: actor(request).id },
      create: { id: nanoid(), projectId: body.projectId, connectorId: body.connectorId, status: "pending", requestedBy: actor(request).id }
    });
    await auditSelfService(app, request, "self_service.access_request.create", created.id, "Connector access self-service request created");
    return created;
  });

  app.post("/self-service/connector-requests", { preHandler: requireActor }, async (request: any) => {
    const body = connectorRequestSchema.parse(request.body);
    const created = await app.db.selfServiceRequest.create({
      data: {
        id: nanoid(),
        type: "new_connector_registration",
        source: body.source,
        status: "draft",
        requesterId: actor(request).id,
        projectId: body.projectId,
        team: body.team,
        connectorId: body.connectorId,
        desiredSystem: body.desiredSystem,
        requestedTools: body.requestedTools,
        readOrWriteIntent: body.readOrWriteIntent,
        businessJustification: body.businessJustification,
        dataClassification: body.dataClassification,
        expectedVolume: body.expectedVolume,
        approvalRequired: true,
        approvers: body.approvers,
        ownerTeam: body.ownerTeam,
        runtimeOwner: body.runtimeOwner,
        securityReviewer: body.securityReviewer,
        deploymentMode: body.deploymentMode,
        metadata: { sdd: true },
        artifacts: {
          create: sddArtifactTemplates(body.desiredSystem).map((artifact) => ({ id: nanoid(), ...artifact }))
        }
      },
      include: { artifacts: true, approvalSteps: true, comments: true }
    });
    await auditSelfService(app, request, "self_service.connector_request.create", created.id, "New connector self-service request created");
    return created;
  });

  app.post("/self-service/requests/:id/submit", { preHandler: requireActor }, async (request: any) => {
    const updated = await app.db.selfServiceRequest.update({
      where: { id: request.params.id },
      data: {
        status: "submitted",
        approvalSteps: {
          create: [
            { id: nanoid(), stepName: "security_review", status: "pending", approverRole: "security_reviewer" },
            { id: nanoid(), stepName: "platform_review", status: "pending", approverRole: "platform_admin" }
          ]
        }
      },
      include: { artifacts: true, approvalSteps: true, comments: true }
    });
    await auditSelfService(app, request, "self_service.request.submit", updated.id, "Self-service request submitted for review");
    return updated;
  });

  app.post("/self-service/requests/:id/approve", { preHandler: requireActor }, async (request: any) => {
    requireReviewer(request);
    const body = decisionSchema.parse(request.body ?? {});
    const updated = await app.db.selfServiceRequest.update({
      where: { id: request.params.id },
      data: {
        status: "approved",
        approvalSteps: {
          create: {
            id: nanoid(),
            stepName: "final_approval",
            status: "approved",
            approverRole: actor(request).roles.includes("security_reviewer") ? "security_reviewer" : "platform_admin",
            approverId: actor(request).id,
            decisionReason: body.reason ?? "Approved",
            reviewedAt: new Date()
          }
        }
      },
      include: { artifacts: true, approvalSteps: true, comments: true }
    });
    await auditSelfService(app, request, "self_service.request.approve", updated.id, body.reason ?? "Self-service request approved");
    return updated;
  });

  app.post("/self-service/requests/:id/reject", { preHandler: requireActor }, async (request: any) => {
    requireReviewer(request);
    const body = decisionSchema.parse(request.body ?? {});
    const updated = await app.db.selfServiceRequest.update({
      where: { id: request.params.id },
      data: {
        status: "rejected",
        approvalSteps: {
          create: {
            id: nanoid(),
            stepName: "final_rejection",
            status: "rejected",
            approverRole: actor(request).roles.includes("security_reviewer") ? "security_reviewer" : "platform_admin",
            approverId: actor(request).id,
            decisionReason: body.reason ?? "Rejected",
            reviewedAt: new Date()
          }
        }
      },
      include: { artifacts: true, approvalSteps: true, comments: true }
    });
    await auditSelfService(app, request, "self_service.request.reject", updated.id, body.reason ?? "Self-service request rejected");
    return updated;
  });

  app.post("/self-service/requests/:id/comments", { preHandler: requireActor }, async (request: any) => {
    const body = commentSchema.parse(request.body);
    const comment = await app.db.requestComment.create({
      data: {
        id: nanoid(),
        requestId: request.params.id,
        authorId: actor(request).id,
        body: body.body
      }
    });
    await auditSelfService(app, request, "self_service.request.comment", request.params.id, "Self-service request comment added");
    return comment;
  });
}

