import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { requireActor } from "../auth/auth.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { forbidden } from "../errors.js";

function actor(request: any) {
  if (!request.actor) throw forbidden("Authenticated actor required");
  return request.actor;
}

function requireProjectAdmin(request: any) {
  if (!request.actor.permissions.includes("registry:write") && !request.actor.roles.includes("project_admin")) {
    throw forbidden("Project admin or registry writer required");
  }
}

async function auditProjectAccess(app: FastifyInstance, request: any, action: string, resourceType: string, resourceId: string, projectId: string, reason: string) {
  await writeAuditEvent(app.db, {
    actorId: actor(request).id,
    actorType: "user",
    projectId,
    action,
    resourceType,
    resourceId,
    decision: "allowed",
    reason,
    requestId: request.id,
    metadata: {}
  });
}

export async function registerProjectRoutes(app: FastifyInstance) {
  app.get("/projects", { preHandler: requireActor }, async () => app.db.project.findMany({ include: { team: true } }));
  app.post("/projects", { preHandler: requireActor }, async (request: any) => {
    requireProjectAdmin(request);
    const body = request.body as { id: string; name: string; teamId: string; environment?: string; writeAccess?: boolean };
    const project = await app.db.project.create({
      data: {
        id: body.id,
        name: body.name,
        teamId: body.teamId,
        environment: body.environment ?? "dev",
        writeAccess: body.writeAccess ?? false
      }
    });
    await writeAuditEvent(app.db, {
      actorId: actor(request).id,
      actorType: "user",
      action: "project.create",
      resourceType: "project",
      resourceId: project.id,
      projectId: project.id,
      decision: "allowed",
      reason: "Project created",
      requestId: request.id,
      metadata: {}
    });
    return project;
  });
  app.get("/projects/:id", { preHandler: requireActor }, async (request: any) => app.db.project.findUniqueOrThrow({ where: { id: request.params.id }, include: { connectorRequests: true, skillRequests: true, taskRequests: true } }));

  app.post("/projects/:id/connectors/:connectorId/request-access", { preHandler: requireActor }, async (request: any) => {
    const access = await app.db.connectorAccessRequest.upsert({
      where: { projectId_connectorId: { projectId: request.params.id, connectorId: request.params.connectorId } },
      update: { status: "pending", requestedBy: actor(request).id },
      create: { id: nanoid(), projectId: request.params.id, connectorId: request.params.connectorId, status: "pending", requestedBy: actor(request).id }
    });
    await auditProjectAccess(app, request, "project.connector.request_access", "connector", request.params.connectorId, request.params.id, "Connector access requested");
    return access;
  });
  app.post("/projects/:id/connectors/:connectorId/approve-access", { preHandler: requireActor }, async (request: any) => {
    requireProjectAdmin(request);
    const body = (request.body ?? {}) as { accessLevel?: "read" | "write" | "restricted" };
    const access = await app.db.connectorAccessRequest.upsert({
      where: { projectId_connectorId: { projectId: request.params.id, connectorId: request.params.connectorId } },
      update: { status: "approved", approvedBy: actor(request).id, accessLevel: body.accessLevel ?? "read" },
      create: { id: nanoid(), projectId: request.params.id, connectorId: request.params.connectorId, status: "approved", requestedBy: actor(request).id, approvedBy: actor(request).id, accessLevel: body.accessLevel ?? "read" }
    });
    await auditProjectAccess(app, request, "project.connector.approve_access", "connector", request.params.connectorId, request.params.id, "Connector access approved");
    return access;
  });

  app.post("/projects/:id/skills/:skillId/request-access", { preHandler: requireActor }, async (request: any) => {
    const access = await app.db.skillAccessRequest.upsert({
      where: { projectId_skillId: { projectId: request.params.id, skillId: request.params.skillId } },
      update: { status: "pending", requestedBy: actor(request).id },
      create: { id: nanoid(), projectId: request.params.id, skillId: request.params.skillId, status: "pending", requestedBy: actor(request).id }
    });
    await auditProjectAccess(app, request, "project.skill.request_access", "skill", request.params.skillId, request.params.id, "Skill access requested");
    return access;
  });
  app.post("/projects/:id/skills/:skillId/approve-access", { preHandler: requireActor }, async (request: any) => {
    requireProjectAdmin(request);
    const access = await app.db.skillAccessRequest.upsert({
      where: { projectId_skillId: { projectId: request.params.id, skillId: request.params.skillId } },
      update: { status: "approved", approvedBy: actor(request).id },
      create: { id: nanoid(), projectId: request.params.id, skillId: request.params.skillId, status: "approved", requestedBy: actor(request).id, approvedBy: actor(request).id }
    });
    await auditProjectAccess(app, request, "project.skill.approve_access", "skill", request.params.skillId, request.params.id, "Skill access approved");
    return access;
  });

  app.post("/projects/:id/tasks/:taskId/request-access", { preHandler: requireActor }, async (request: any) => {
    const access = await app.db.taskAccessRequest.upsert({
      where: { projectId_taskId: { projectId: request.params.id, taskId: request.params.taskId } },
      update: { status: "pending", requestedBy: actor(request).id },
      create: { id: nanoid(), projectId: request.params.id, taskId: request.params.taskId, status: "pending", requestedBy: actor(request).id }
    });
    await auditProjectAccess(app, request, "project.task.request_access", "task", request.params.taskId, request.params.id, "Task access requested");
    return access;
  });
  app.post("/projects/:id/tasks/:taskId/approve-access", { preHandler: requireActor }, async (request: any) => {
    requireProjectAdmin(request);
    const access = await app.db.taskAccessRequest.upsert({
      where: { projectId_taskId: { projectId: request.params.id, taskId: request.params.taskId } },
      update: { status: "approved", approvedBy: actor(request).id },
      create: { id: nanoid(), projectId: request.params.id, taskId: request.params.taskId, status: "approved", requestedBy: actor(request).id, approvedBy: actor(request).id }
    });
    await auditProjectAccess(app, request, "project.task.approve_access", "task", request.params.taskId, request.params.id, "Task access approved");
    return access;
  });
}
