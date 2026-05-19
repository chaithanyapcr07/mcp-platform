import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { PolicyEvaluator } from "@mcp-platform/policy-core";
import type { ToolCapability } from "@mcp-platform/shared-types";
import { requireActor } from "../auth/auth.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { ApiError, forbidden, notFound } from "../errors.js";
import { incrementMetric } from "../observability/metrics.js";
import { getConnectorManifest, getSkillManifest, getTaskManifest } from "../registry/registry.service.js";

const evaluator = new PolicyEvaluator();

function actor(request: any) {
  if (!request.actor) throw forbidden("Authenticated actor required");
  return request.actor;
}

async function checkRateLimit(app: FastifyInstance, scope: string, scopeId: string, limitPerMin = 120) {
  const now = new Date();
  const existing = await app.db.rateLimit.findUnique({ where: { scope_scopeId: { scope, scopeId } } });
  if (!existing || existing.resetAt < now) {
    await app.db.rateLimit.upsert({
      where: { scope_scopeId: { scope, scopeId } },
      update: { currentCount: 1, limitPerMin, resetAt: new Date(Date.now() + 60_000) },
      create: { id: nanoid(), scope, scopeId, currentCount: 1, limitPerMin, resetAt: new Date(Date.now() + 60_000) }
    });
    return;
  }
  if (existing.currentCount >= existing.limitPerMin) throw new ApiError(429, `Rate limit exceeded for ${scope}:${scopeId}`, "rate_limited");
  await app.db.rateLimit.update({ where: { id: existing.id }, data: { currentCount: { increment: 1 } } });
}

async function projectConnectorAccess(app: FastifyInstance, projectId: string, connectorId: string) {
  return app.db.connectorAccessRequest.findUnique({ where: { projectId_connectorId: { projectId, connectorId } } });
}

async function invokeRemoteConnector(connectorId: string, toolName: string, input: Record<string, unknown>, requestId: string) {
  const baseUrl = connectorId === "local-knowledge-base"
    ? process.env.LOCAL_KB_CONNECTOR_URL ?? "http://localhost:4100"
    : undefined;
  if (!baseUrl) throw new ApiError(501, `No runtime adapter configured for connector ${connectorId}`, "connector_runtime_missing");
  const response = await fetch(`${baseUrl}/tools/${toolName}/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": requestId },
    body: JSON.stringify(input)
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(response.status, payload.message ?? "Connector invocation failed", "connector_invocation_failed", payload);
  return payload;
}

export async function registerGatewayRoutes(app: FastifyInstance) {
  app.get("/gateway/connectors/:connectorId/health", { preHandler: requireActor }, async (request: any) => {
    const connectorId = request.params.connectorId;
    const baseUrl = connectorId === "local-knowledge-base" ? process.env.LOCAL_KB_CONNECTOR_URL ?? "http://localhost:4100" : undefined;
    if (!baseUrl) throw notFound("Connector runtime");
    const response = await fetch(`${baseUrl}/health`);
    return { connectorId, healthy: response.ok, details: await response.json() };
  });

  app.post("/gateway/connectors/:connectorId/tools/:toolName/invoke", { preHandler: requireActor }, async (request: any) => {
    const requestId = request.headers["x-correlation-id"] ?? request.id;
    const connectorId = request.params.connectorId;
    const toolName = request.params.toolName;
    const body = request.body as { projectId?: string; input?: Record<string, unknown>; skillId?: string; taskId?: string };
    const projectId = (request.headers["x-project-id"] as string | undefined) ?? body.projectId;
    if (!projectId) throw new ApiError(400, "projectId is required via x-project-id header or request body", "missing_project");
    const connector = await getConnectorManifest(app.db, connectorId);
    const tool = connector.tools.find((entry) => entry.name === toolName) as ToolCapability | undefined;
    const skill = body.skillId ? await getSkillManifest(app.db, body.skillId) : undefined;
    const task = body.taskId ? await getTaskManifest(app.db, body.taskId) : undefined;
    const access = await projectConnectorAccess(app, projectId, connectorId);
    const skillAccess = skill ? await app.db.skillAccessRequest.findUnique({ where: { projectId_skillId: { projectId, skillId: skill.id } } }) : undefined;
    const taskAccess = task ? await app.db.taskAccessRequest.findUnique({ where: { projectId_taskId: { projectId, taskId: task.id } } }) : undefined;
    const project = await app.db.project.findUnique({ where: { id: projectId } });
    const decision = evaluator.evaluateConnectorTool({
      actor: actor(request),
      projectId,
      connector,
      skill,
      task,
      tool,
      hasProjectConnectorAccess: access?.status === "approved",
      hasProjectSkillAccess: skill ? skillAccess?.status === "approved" : true,
      hasProjectTaskAccess: task ? taskAccess?.status === "approved" : true,
      hasExplicitRestrictedApproval: access?.accessLevel === "restricted",
      hasWriteAccess: Boolean(project?.writeAccess || access?.accessLevel === "write"),
      requestId
    });

    if (decision.decision !== "allowed") {
      incrementMetric("policy_denial_count", { connectorId, toolName });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "gateway.tool.invoke",
        resourceType: "tool",
        resourceId: `${connectorId}.${toolName}`,
        connectorId,
        skillId: skill?.id,
        taskId: task?.id,
        toolName,
        decision: decision.decision === "requires_approval" ? "denied" : decision.decision,
        reason: decision.reason,
        requestId,
        metadata: { requiredApproval: decision.requiredApproval }
      });
      throw new ApiError(decision.decision === "requires_approval" ? 409 : 403, decision.reason, decision.decision);
    }

    await checkRateLimit(app, "project", projectId);
    await checkRateLimit(app, "connector_tool", `${connectorId}:${toolName}`);
    const startedAt = Date.now();
    try {
      const output = await invokeRemoteConnector(connectorId, toolName, body.input ?? body as Record<string, unknown>, requestId);
      const latencyMs = Date.now() - startedAt;
      incrementMetric("connector_execution_count", { connectorId });
      incrementMetric("tool_latency", { connectorId, toolName, bucket: latencyMs < 250 ? "fast" : "slow" });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "gateway.tool.invoke",
        resourceType: "tool",
        resourceId: `${connectorId}.${toolName}`,
        connectorId,
        skillId: skill?.id,
        taskId: task?.id,
        toolName,
        decision: "allowed",
        reason: "Tool invocation allowed and completed",
        requestId,
        metadata: { latencyMs }
      });
      return { requestId, connectorId, toolName, output };
    } catch (error: any) {
      const latencyMs = Date.now() - startedAt;
      incrementMetric("connector_error_count", { connectorId });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "gateway.tool.invoke",
        resourceType: "tool",
        resourceId: `${connectorId}.${toolName}`,
        connectorId,
        skillId: skill?.id,
        taskId: task?.id,
        toolName,
        decision: "allowed",
        reason: "Tool invocation allowed but connector execution failed",
        requestId,
        metadata: { latencyMs, error: error.message }
      });
      throw error;
    }
  });

  async function executeTask(request: any) {
    const requestId = request.headers["x-correlation-id"] ?? request.id;
    const taskId = request.params.taskId ?? request.params.id;
    const body = request.body as { projectId?: string; query?: string; input?: Record<string, unknown> };
    const projectId = (request.headers["x-project-id"] as string | undefined) ?? body.projectId;
    if (!projectId) throw new ApiError(400, "projectId is required via x-project-id header or request body", "missing_project");
    const task = await getTaskManifest(app.db, taskId);
    const taskAccess = await app.db.taskAccessRequest.findUnique({ where: { projectId_taskId: { projectId, taskId } } });
    const taskDecision = evaluator.evaluateTask({
      actor: actor(request),
      projectId,
      task,
      hasProjectTaskAccess: taskAccess?.status === "approved",
      requestId
    });
    if (taskDecision.decision !== "allowed") {
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "gateway.task.execute",
        resourceType: "task",
        resourceId: taskId,
        taskId,
        decision: taskDecision.decision === "requires_approval" ? "denied" : taskDecision.decision,
        reason: taskDecision.reason,
        requestId,
        metadata: {}
      });
      throw new ApiError(taskDecision.decision === "requires_approval" ? 409 : 403, taskDecision.reason, taskDecision.decision);
    }
    await checkRateLimit(app, "task", taskId);
    const execution = await app.db.taskExecution.create({
      data: {
        id: nanoid(),
        taskId,
        projectId,
        actorId: actor(request).id,
        status: "running",
        input: body.input ?? body
      }
    });

    const requiredSkillId = task.requiredSkills[0];
    const skill = requiredSkillId ? await getSkillManifest(app.db, requiredSkillId) : undefined;
    const connectorId = skill?.requiredConnectors[0] ?? "local-knowledge-base";
    const toolName = "search_items";
    const connector = await getConnectorManifest(app.db, connectorId);
    const tool = connector.tools.find((entry) => entry.name === toolName) as ToolCapability | undefined;
    const connectorAccess = await projectConnectorAccess(app, projectId, connectorId);
    const skillAccess = skill ? await app.db.skillAccessRequest.findUnique({ where: { projectId_skillId: { projectId, skillId: skill.id } } }) : undefined;
    const project = await app.db.project.findUnique({ where: { id: projectId } });
    const nestedDecision = evaluator.evaluateConnectorTool({
      actor: actor(request),
      projectId,
      connector,
      skill,
      task,
      tool,
      hasProjectConnectorAccess: connectorAccess?.status === "approved",
      hasProjectSkillAccess: skill ? skillAccess?.status === "approved" : true,
      hasProjectTaskAccess: taskAccess?.status === "approved",
      hasExplicitRestrictedApproval: connectorAccess?.accessLevel === "restricted",
      hasWriteAccess: Boolean(project?.writeAccess || connectorAccess?.accessLevel === "write"),
      requestId
    });
    if (nestedDecision.decision !== "allowed") {
      await app.db.taskExecution.update({
        where: { id: execution.id },
        data: { status: "denied", output: { reason: nestedDecision.reason }, endedAt: new Date() }
      });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "gateway.task.step.policy",
        resourceType: "tool",
        resourceId: `${connectorId}.${toolName}`,
        connectorId,
        skillId: requiredSkillId,
        taskId,
        toolName,
        decision: nestedDecision.decision === "requires_approval" ? "denied" : nestedDecision.decision,
        reason: nestedDecision.reason,
        requestId,
        metadata: { requiredApproval: nestedDecision.requiredApproval }
      });
      throw new ApiError(nestedDecision.decision === "requires_approval" ? 409 : 403, nestedDecision.reason, nestedDecision.decision);
    }
    const step = await app.db.taskExecutionStep.create({
      data: {
        id: nanoid(),
        executionId: execution.id,
        skillId: requiredSkillId ?? "direct",
        connectorId,
        toolName,
        status: "running",
        input: body.input ?? body
      }
    });
    try {
      const output = await invokeRemoteConnector(connectorId, toolName, { query: body.query ?? (body.input?.query as string) ?? "" }, requestId);
      const finalOutput = {
        result: output,
        draftResponse: `Draft response based on ${connectorId}: ${JSON.stringify(output).slice(0, 500)}`
      };
      await app.db.taskExecutionStep.update({ where: { id: step.id }, data: { status: "succeeded", output: finalOutput, endedAt: new Date() } });
      await app.db.taskExecution.update({ where: { id: execution.id }, data: { status: "succeeded", output: finalOutput, endedAt: new Date() } });
      incrementMetric("task_execution_count", { taskId });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "gateway.task.execute",
        resourceType: "task",
        resourceId: taskId,
        skillId: requiredSkillId,
        taskId,
        connectorId,
        toolName,
        decision: "allowed",
        reason: "Task execution allowed and completed",
        requestId,
        metadata: { executionId: execution.id }
      });
      return { requestId, executionId: execution.id, output: finalOutput };
    } catch (error: any) {
      await app.db.taskExecutionStep.update({ where: { id: step.id }, data: { status: "failed", output: { error: error.message }, endedAt: new Date() } });
      await app.db.taskExecution.update({ where: { id: execution.id }, data: { status: "failed", output: { error: error.message }, endedAt: new Date() } });
      incrementMetric("task_error_count", { taskId });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "gateway.task.execute",
        resourceType: "task",
        resourceId: taskId,
        skillId: requiredSkillId,
        taskId,
        connectorId,
        toolName,
        decision: "allowed",
        reason: "Task execution allowed but failed during connector execution",
        requestId,
        metadata: { executionId: execution.id, error: error.message }
      });
      throw error;
    }
  }

  app.post("/gateway/tasks/:taskId/execute", { preHandler: requireActor }, executeTask);
  app.post("/tasks/:id/execute", { preHandler: requireActor }, executeTask);
}
