import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { requireActor } from "../auth/auth.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { forbidden } from "../errors.js";
import {
  getConnectorManifest,
  getSkillManifest,
  getTaskManifest,
  listConnectors,
  listSkills,
  listTasks,
  upsertConnector,
  upsertSkill,
  upsertTask
} from "./registry.service.js";

function actor(request: any) {
  if (!request.actor) throw forbidden("Authenticated actor required");
  return request.actor;
}

function requireAnyPermission(request: any, permissions: string[]) {
  const hasPermission = permissions.some((permission) => request.actor?.permissions.includes(permission));
  if (!hasPermission) throw forbidden(`Actor lacks one of: ${permissions.join(", ")}`);
}

function forbidOwnerSelfApproval(request: any, ownerTeam: string, ownerRoles: string[], resourceType: string) {
  const isOwnerRole = actor(request).roles.some((role: string) => ownerRoles.includes(role));
  const isOwnerTeam = actor(request).teamIds.includes(ownerTeam);
  if (isOwnerRole && isOwnerTeam) {
    throw forbidden(`${resourceType} owners cannot approve their own ${resourceType}`);
  }
}

async function auditRegistry(app: FastifyInstance, request: any, action: string, resourceType: string, resourceId: string, decision = "allowed", reason = "Registry mutation completed") {
  await writeAuditEvent(app.db, {
    actorId: actor(request).id,
    actorType: "user",
    action,
    resourceType,
    resourceId,
    decision: decision as "allowed" | "denied",
    reason,
    requestId: request.id,
    metadata: {}
  });
}

export async function registerRegistryRoutes(app: FastifyInstance) {
  app.get("/connectors", { preHandler: requireActor }, async () => listConnectors(app.db));
  app.get("/connectors/:id", { preHandler: requireActor }, async (request: any) => getConnectorManifest(app.db, request.params.id));
  app.get("/connectors/:id/tools", { preHandler: requireActor }, async (request: any) => app.db.connectorTool.findMany({ where: { connectorId: request.params.id } }));
  app.get("/connectors/:id/resources", { preHandler: requireActor }, async (request: any) => app.db.connectorResource.findMany({ where: { connectorId: request.params.id } }));
  app.get("/connectors/:id/prompts", { preHandler: requireActor }, async (request: any) => app.db.connectorPrompt.findMany({ where: { connectorId: request.params.id } }));
  app.post("/connectors", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["connector:create", "registry:write"]);
    const connector = await upsertConnector(app.db, request.body);
    await auditRegistry(app, request, "connector.create", "connector", connector.id);
    return connector;
  });
  app.put("/connectors/:id", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["connector:update", "registry:write"]);
    const connector = await upsertConnector(app.db, { ...request.body, id: request.params.id });
    await auditRegistry(app, request, "connector.update", "connector", connector.id);
    return connector;
  });
  app.post("/connectors/:id/submit-review", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["connector:update", "registry:write"]);
    const connector = await app.db.connector.update({ where: { id: request.params.id }, data: { status: "pending_review" } });
    await auditRegistry(app, request, "connector.submit_review", "connector", connector.id);
    return connector;
  });
  app.post("/connectors/:id/approve", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["connector:approve"]);
    const existing = await getConnectorManifest(app.db, request.params.id);
    forbidOwnerSelfApproval(request, existing.ownerTeam, ["connector_owner"], "connector");
    if ((existing.riskLevel === "high" || existing.riskLevel === "critical") && !actor(request).roles.some((role: string) => ["platform_admin", "security_reviewer"].includes(role))) {
      throw forbidden("Only platform_admin or security_reviewer can approve high-risk connectors");
    }
    const connector = await app.db.connector.update({ where: { id: request.params.id }, data: { status: "approved" } });
    await app.db.approval.create({ data: { id: nanoid(), resourceType: "connector", resourceId: connector.id, status: "approved", requestedBy: actor(request).id, reviewedBy: actor(request).id } });
    await auditRegistry(app, request, "connector.approve", "connector", connector.id);
    return connector;
  });
  app.post("/connectors/:id/disable", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["connector:disable"]);
    const connector = await app.db.connector.update({ where: { id: request.params.id }, data: { status: "disabled" } });
    await auditRegistry(app, request, "connector.disable", "connector", connector.id);
    return connector;
  });

  app.get("/skills", { preHandler: requireActor }, async () => listSkills(app.db));
  app.get("/skills/:id", { preHandler: requireActor }, async (request: any) => getSkillManifest(app.db, request.params.id));
  app.post("/skills", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["skill:create", "registry:write"]);
    const skill = await upsertSkill(app.db, request.body);
    await auditRegistry(app, request, "skill.create", "skill", skill.id);
    return skill;
  });
  app.put("/skills/:id", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["skill:update", "registry:write"]);
    const skill = await upsertSkill(app.db, { ...request.body, id: request.params.id });
    await auditRegistry(app, request, "skill.update", "skill", skill.id);
    return skill;
  });
  app.post("/skills/:id/submit-review", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["skill:update", "registry:write"]);
    const skill = await app.db.skill.update({ where: { id: request.params.id }, data: { status: "pending_review" } });
    await auditRegistry(app, request, "skill.submit_review", "skill", skill.id);
    return skill;
  });
  app.post("/skills/:id/approve", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["skill:approve"]);
    const existing = await getSkillManifest(app.db, request.params.id);
    forbidOwnerSelfApproval(request, existing.ownerTeam, ["skill_owner"], "skill");
    const skill = await app.db.skill.update({ where: { id: request.params.id }, data: { status: "approved" } });
    await app.db.approval.create({ data: { id: nanoid(), resourceType: "skill", resourceId: skill.id, status: "approved", requestedBy: actor(request).id, reviewedBy: actor(request).id } });
    await auditRegistry(app, request, "skill.approve", "skill", skill.id);
    return skill;
  });
  app.post("/skills/:id/disable", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["skill:disable"]);
    const skill = await app.db.skill.update({ where: { id: request.params.id }, data: { status: "disabled" } });
    await auditRegistry(app, request, "skill.disable", "skill", skill.id);
    return skill;
  });

  app.get("/tasks", { preHandler: requireActor }, async () => listTasks(app.db));
  app.get("/tasks/:id", { preHandler: requireActor }, async (request: any) => getTaskManifest(app.db, request.params.id));
  app.post("/tasks", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["task:create", "registry:write"]);
    const task = await upsertTask(app.db, request.body);
    await auditRegistry(app, request, "task.create", "task", task.id);
    return task;
  });
  app.put("/tasks/:id", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["task:update", "registry:write"]);
    const task = await upsertTask(app.db, { ...request.body, id: request.params.id });
    await auditRegistry(app, request, "task.update", "task", task.id);
    return task;
  });
  app.post("/tasks/:id/submit-review", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["task:update", "registry:write"]);
    const task = await app.db.task.update({ where: { id: request.params.id }, data: { status: "pending_review" } });
    await auditRegistry(app, request, "task.submit_review", "task", task.id);
    return task;
  });
  app.post("/tasks/:id/approve", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["task:approve"]);
    const existing = await getTaskManifest(app.db, request.params.id);
    forbidOwnerSelfApproval(request, existing.ownerTeam, ["task_owner"], "task");
    const task = await app.db.task.update({ where: { id: request.params.id }, data: { status: "approved" } });
    await app.db.approval.create({ data: { id: nanoid(), resourceType: "task", resourceId: task.id, status: "approved", requestedBy: actor(request).id, reviewedBy: actor(request).id } });
    await auditRegistry(app, request, "task.approve", "task", task.id);
    return task;
  });
  app.post("/tasks/:id/disable", { preHandler: requireActor }, async (request: any) => {
    requireAnyPermission(request, ["task:disable"]);
    const task = await app.db.task.update({ where: { id: request.params.id }, data: { status: "disabled" } });
    await auditRegistry(app, request, "task.disable", "task", task.id);
    return task;
  });
  app.post("/tasks/:id/validate", { preHandler: requireActor }, async (request: any) => ({ valid: true, task: await getTaskManifest(app.db, request.params.id) }));
}
