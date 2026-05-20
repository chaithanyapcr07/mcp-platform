import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { PolicyEvaluator } from "@mcp-platform/policy-core";
import type { ToolCapability } from "@mcp-platform/shared-types";
import { requireActor } from "../auth/auth.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { ApiError, forbidden, notFound } from "../errors.js";
import {
  connectorHealthStatus,
  incrementMetric,
  recordGatewayRequest,
  recordPolicyDecision,
  recordToolError,
  recordToolInvocation,
  rbacChecksTotal,
  rbacDenialsTotal,
  taskExecutionDuration,
  taskExecutionsTotal
} from "../observability/metrics.js";
import { safeReasonCode } from "../observability/sanitizer.js";
import { injectTraceHeaders, withSpan } from "../observability/tracing.js";
import { getConnectorManifest, getSkillManifest, getTaskManifest } from "../registry/registry.service.js";
import { LocalMockSecretProvider, type SecretReference } from "../secrets/secret-provider.js";

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

function recordGatewayRbacChecks(requestActor: ReturnType<typeof actor>, permissions: string[]) {
  for (const permission of [...new Set(permissions)]) {
    const allowed = requestActor.permissions.includes(permission);
    rbacChecksTotal.inc({
      permission,
      decision: allowed ? "allowed" : "denied",
      reason_code: allowed ? "RBAC_ALLOWED" : "RBAC_DENIED"
    });
    if (!allowed) rbacDenialsTotal.inc({ permission, reason_code: "RBAC_DENIED" });
  }
}

async function resolveConnectorSecretReference(app: FastifyInstance, connectorId: string) {
  const reference = await app.db.connectorSecret.findFirst({ where: { connectorId } });
  if (!reference) return;
  const provider = new LocalMockSecretProvider();
  await provider.resolve({
    secretRef: reference.secretRef,
    secretProvider: reference.secretProvider as SecretReference["secretProvider"],
    secretVersion: reference.secretVersion,
    allowedRuntimeIdentity: reference.allowedRuntimeIdentity,
    rotationStatus: reference.rotationStatus as SecretReference["rotationStatus"],
    lastRotatedAt: reference.lastRotatedAt ?? undefined
  }, "mcp-gateway-local");
}

async function invokeRemoteConnector(connectorId: string, toolName: string, input: Record<string, unknown>, requestId: string) {
  const baseUrl = connectorId === "local-knowledge-base"
    ? process.env.LOCAL_KB_CONNECTOR_URL ?? "http://localhost:4100"
    : connectorId === "jira"
      ? process.env.JIRA_CONNECTOR_URL ?? "http://localhost:4200"
      : undefined;
  if (!baseUrl) throw new ApiError(501, `No runtime adapter configured for connector ${connectorId}`, "connector_runtime_missing");
  return withSpan("connector.invoke", {
    connector_id: connectorId,
    tool_name: toolName,
    request_id: requestId,
    connector_runtime: connectorId === "jira" ? process.env.JIRA_AUTH_MODE ?? "mock" : "managed"
  }, async () => {
    const response = await fetch(`${baseUrl}/tools/${encodeURIComponent(toolName)}/invoke`, {
      method: "POST",
      headers: injectTraceHeaders({ "content-type": "application/json", "x-request-id": requestId }),
      body: JSON.stringify(input)
    });
    const payload = await response.json();
    if (!response.ok) throw new ApiError(response.status, payload.message ?? "Connector invocation failed", "connector_invocation_failed", payload);
    return payload;
  });
}

export async function registerGatewayRoutes(app: FastifyInstance) {
  app.get("/gateway/connectors/:connectorId/health", { preHandler: requireActor }, async (request: any) => {
    const connectorId = request.params.connectorId;
    const baseUrl = connectorId === "local-knowledge-base"
      ? process.env.LOCAL_KB_CONNECTOR_URL ?? "http://localhost:4100"
      : connectorId === "jira"
        ? process.env.JIRA_CONNECTOR_URL ?? "http://localhost:4200"
        : undefined;
    if (!baseUrl) throw notFound("Connector runtime");
    return withSpan("connector.health", { connector_id: connectorId }, async () => {
      const response = await fetch(`${baseUrl}/health`);
      connectorHealthStatus.set({ connector_id: connectorId, status: response.ok ? "healthy" : "unhealthy" }, response.ok ? 1 : 0);
      return { connectorId, healthy: response.ok, details: await response.json() };
    });
  });

  app.post("/gateway/connectors/:connectorId/tools/:toolName/invoke", { preHandler: requireActor }, async (request: any) => {
    const requestId = request.headers["x-correlation-id"] ?? request.id;
    const connectorId = request.params.connectorId;
    const toolName = request.params.toolName;
    const routeStarted = Date.now();
    return withSpan("gateway.invoke_tool", {
      request_id: requestId,
      actor_id: actor(request).id,
      project_id: request.body?.projectId,
      connector_id: connectorId,
      tool_name: toolName
    }, async () => {
    const body = request.body as { projectId?: string; input?: Record<string, unknown>; skillId?: string; taskId?: string };
    const projectId = (request.headers["x-project-id"] as string | undefined) ?? body.projectId;
    if (!projectId) throw new ApiError(400, "projectId is required via x-project-id header or request body", "missing_project");
    const connector = await getConnectorManifest(app.db, connectorId);
    const tool = connector.tools.find((entry) => entry.name === toolName) as ToolCapability | undefined;
    recordGatewayRbacChecks(actor(request), ["connector:execute", "tool:execute", ...(tool?.permissions ?? [])]);
    const skill = body.skillId ? await getSkillManifest(app.db, body.skillId) : undefined;
    const task = body.taskId ? await getTaskManifest(app.db, body.taskId) : undefined;
    const access = await projectConnectorAccess(app, projectId, connectorId);
    const skillAccess = skill ? await app.db.skillAccessRequest.findUnique({ where: { projectId_skillId: { projectId, skillId: skill.id } } }) : undefined;
    const taskAccess = task ? await app.db.taskAccessRequest.findUnique({ where: { projectId_taskId: { projectId, taskId: task.id } } }) : undefined;
    const project = await app.db.project.findUnique({ where: { id: projectId } });
    const policyStarted = Date.now();
    const decision = await withSpan("policy.evaluate", {
      request_id: requestId,
      actor_id: actor(request).id,
      project_id: projectId,
      connector_id: connectorId,
      skill_id: skill?.id,
      task_id: task?.id,
      tool_name: toolName,
      risk_level: connector.riskLevel,
      data_classification: connector.dataClassification
    }, async () => evaluator.evaluateConnectorTool({
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
    }));
    const normalizedDecision = decision.decision === "allowed" ? "allowed" : "denied";
    const reasonCode = safeReasonCode(decision.reason);
    recordPolicyDecision({
      connectorId,
      toolName,
      decision: normalizedDecision,
      reasonCode,
      riskLevel: connector.riskLevel,
      dataClassification: connector.dataClassification
    }, (Date.now() - policyStarted) / 1000);

    if (decision.decision !== "allowed") {
      if (decision.decision === "requires_approval") {
        await app.db.approval.create({
          data: {
            id: nanoid(),
            resourceType: "tool_execution",
            resourceId: `${connectorId}.${toolName}:${requestId}`,
            status: "pending",
            requestedBy: actor(request).id,
            reason: decision.reason
          }
        });
      }
      incrementMetric("policy_denial_count", { connectorId, toolName });
      recordGatewayRequest({
        connectorId,
        toolName,
        decision: "denied",
        reasonCode,
        status: decision.decision,
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification
      }, (Date.now() - routeStarted) / 1000);
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "tool.invoke",
        resourceType: "tool",
        resourceId: `${connectorId}.${toolName}`,
        connectorId,
        skillId: skill?.id,
        taskId: task?.id,
        toolName,
        decision: decision.decision === "requires_approval" ? "denied" : decision.decision,
        reason: decision.reason,
        reasonCode,
        requestId,
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification,
        metadata: { requiredApproval: decision.requiredApproval, connectorRuntime: connector.runtimeType }
      });
      throw new ApiError(decision.decision === "requires_approval" ? 409 : 403, decision.reason, "POLICY_DENIED");
    }

    await checkRateLimit(app, "project", projectId);
    await checkRateLimit(app, "connector_tool", `${connectorId}:${toolName}`);
    await resolveConnectorSecretReference(app, connectorId);
    const startedAt = Date.now();
    try {
      const output = await invokeRemoteConnector(connectorId, toolName, body.input ?? body as Record<string, unknown>, requestId);
      const latencyMs = Date.now() - startedAt;
      recordGatewayRequest({
        connectorId,
        toolName,
        decision: "allowed",
        reasonCode: "POLICY_ALLOWED",
        status: "success",
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification
      }, (Date.now() - routeStarted) / 1000);
      recordToolInvocation({
        connectorId,
        toolName,
        decision: "allowed",
        reasonCode: "POLICY_ALLOWED",
        status: "success",
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification
      }, latencyMs / 1000);
      incrementMetric("connector_execution_count", { connectorId });
      incrementMetric("tool_latency", { connectorId, toolName, bucket: latencyMs < 250 ? "fast" : "slow" });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "tool.invoke",
        resourceType: "tool",
        resourceId: `${connectorId}.${toolName}`,
        connectorId,
        skillId: skill?.id,
        taskId: task?.id,
        toolName,
        decision: "allowed",
        reason: "Tool invocation allowed and completed",
        reasonCode: "POLICY_ALLOWED",
        requestId,
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification,
        metadata: { latencyMs, connectorRuntime: connector.runtimeType }
      });
      return { requestId, connectorId, toolName, output };
    } catch (error: any) {
      const latencyMs = Date.now() - startedAt;
      incrementMetric("connector_error_count", { connectorId });
      recordGatewayRequest({
        connectorId,
        toolName,
        decision: "allowed",
        reasonCode: "CONNECTOR_ERROR",
        status: "error",
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification
      }, (Date.now() - routeStarted) / 1000);
      recordToolError({
        connectorId,
        toolName,
        decision: "allowed",
        reasonCode: "CONNECTOR_ERROR",
        status: "error",
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification
      });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "tool.invoke",
        resourceType: "tool",
        resourceId: `${connectorId}.${toolName}`,
        connectorId,
        skillId: skill?.id,
        taskId: task?.id,
        toolName,
        decision: "allowed",
        reason: "Tool invocation allowed but connector execution failed",
        reasonCode: "CONNECTOR_ERROR",
        requestId,
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification,
        metadata: { latencyMs, error: error.message, connectorRuntime: connector.runtimeType }
      });
      throw error;
    }
    });
  });

  async function executeTask(request: any) {
    const requestId = request.headers["x-correlation-id"] ?? request.id;
    const taskId = request.params.taskId ?? request.params.id;
    const taskStarted = Date.now();
    return withSpan("gateway.execute_task", {
      request_id: requestId,
      actor_id: actor(request).id,
      task_id: taskId,
      project_id: request.body?.projectId
    }, async () => {
    const body = request.body as { projectId?: string; query?: string; input?: Record<string, unknown> };
    const projectId = (request.headers["x-project-id"] as string | undefined) ?? body.projectId;
    if (!projectId) throw new ApiError(400, "projectId is required via x-project-id header or request body", "missing_project");
    const task = await getTaskManifest(app.db, taskId);
    const taskAccess = await app.db.taskAccessRequest.findUnique({ where: { projectId_taskId: { projectId, taskId } } });
    const taskPolicyStarted = Date.now();
    const taskDecision = await withSpan("policy.evaluate", {
      request_id: requestId,
      actor_id: actor(request).id,
      project_id: projectId,
      task_id: taskId
    }, async () => evaluator.evaluateTask({
      actor: actor(request),
      projectId,
      task,
      hasProjectTaskAccess: taskAccess?.status === "approved",
      requestId
    }));
    recordPolicyDecision({
      decision: taskDecision.decision === "allowed" ? "allowed" : "denied",
      reasonCode: safeReasonCode(taskDecision.reason),
      status: taskDecision.decision
    }, (Date.now() - taskPolicyStarted) / 1000);
    if (taskDecision.decision !== "allowed") {
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "task.execute",
        resourceType: "task",
        resourceId: taskId,
        taskId,
        decision: taskDecision.decision === "requires_approval" ? "denied" : taskDecision.decision,
        reason: taskDecision.reason,
        reasonCode: safeReasonCode(taskDecision.reason),
        requestId,
        metadata: {}
      });
      throw new ApiError(taskDecision.decision === "requires_approval" ? 409 : 403, taskDecision.reason, "POLICY_DENIED");
    }
    await checkRateLimit(app, "task", taskId);
    const execution = await app.db.taskExecution.create({
      data: {
        id: nanoid(),
        taskId,
        projectId,
        actorId: actor(request).id,
        status: "running",
        input: (body.input ?? body) as any
      }
    });

    const requiredSkillId = task.requiredSkills[0];
    const skill = requiredSkillId ? await getSkillManifest(app.db, requiredSkillId) : undefined;
    const connectorId = skill?.requiredConnectors[0] ?? "local-knowledge-base";
    const toolName = connectorId === "jira"
      ? taskId === "summarize-open-bugs" ? "jira.search_issues" : "jira.create_issue"
      : "search_items";
    const connector = await getConnectorManifest(app.db, connectorId);
    const tool = connector.tools.find((entry) => entry.name === toolName) as ToolCapability | undefined;
    recordGatewayRbacChecks(actor(request), ["connector:execute", "skill:execute", "task:execute", "tool:execute", ...(tool?.permissions ?? [])]);
    const connectorAccess = await projectConnectorAccess(app, projectId, connectorId);
    const skillAccess = skill ? await app.db.skillAccessRequest.findUnique({ where: { projectId_skillId: { projectId, skillId: skill.id } } }) : undefined;
    const project = await app.db.project.findUnique({ where: { id: projectId } });
    const nestedPolicyStarted = Date.now();
    const nestedDecision = await withSpan("policy.evaluate", {
      request_id: requestId,
      actor_id: actor(request).id,
      project_id: projectId,
      connector_id: connectorId,
      skill_id: skill?.id,
      task_id: taskId,
      tool_name: toolName,
      risk_level: connector.riskLevel,
      data_classification: connector.dataClassification
    }, async () => evaluator.evaluateConnectorTool({
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
    }));
    recordPolicyDecision({
      connectorId,
      toolName,
      decision: nestedDecision.decision === "allowed" ? "allowed" : "denied",
      reasonCode: safeReasonCode(nestedDecision.reason),
      riskLevel: connector.riskLevel,
      dataClassification: connector.dataClassification
    }, (Date.now() - nestedPolicyStarted) / 1000);
    if (nestedDecision.decision !== "allowed") {
      await app.db.taskExecution.update({
        where: { id: execution.id },
        data: { status: "denied", output: { reason: nestedDecision.reason }, endedAt: new Date() }
      });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "task.step.policy",
        resourceType: "tool",
        resourceId: `${connectorId}.${toolName}`,
        connectorId,
        skillId: requiredSkillId,
        taskId,
        toolName,
        decision: nestedDecision.decision === "requires_approval" ? "denied" : nestedDecision.decision,
        reason: nestedDecision.reason,
        reasonCode: safeReasonCode(nestedDecision.reason),
        requestId,
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification,
        metadata: { requiredApproval: nestedDecision.requiredApproval, connectorRuntime: connector.runtimeType }
      });
      throw new ApiError(nestedDecision.decision === "requires_approval" ? 409 : 403, nestedDecision.reason, "POLICY_DENIED");
    }
    const step = await app.db.taskExecutionStep.create({
      data: {
        id: nanoid(),
        executionId: execution.id,
        skillId: requiredSkillId ?? "direct",
        connectorId,
        toolName,
        status: "running",
        input: (body.input ?? body) as any
      }
    });
    try {
      const input = connectorId === "jira" && toolName === "jira.search_issues"
        ? {
          jql: String(body.input?.jql ?? body.query ?? "project = DEMO ORDER BY created DESC"),
          maxResults: Number(body.input?.maxResults ?? 10)
        }
        : connectorId === "jira"
        ? {
          projectKey: String(body.input?.projectKey ?? "DEMO"),
          summary: String(body.input?.summary ?? body.query ?? "Incident follow-up"),
          description: String(body.input?.description ?? "Created through governed MCP task execution."),
          issueType: String(body.input?.issueType ?? "Bug"),
          labels: Array.isArray(body.input?.labels) ? body.input.labels : ["mcp-platform"]
        }
        : { query: body.query ?? (body.input?.query as string) ?? "" };
      await resolveConnectorSecretReference(app, connectorId);
      const output = await invokeRemoteConnector(connectorId, toolName, input, requestId);
      const taskDurationSeconds = (Date.now() - taskStarted) / 1000;
      const finalOutput = {
        result: output,
        draftResponse: `Draft response based on ${connectorId}: ${JSON.stringify(output).slice(0, 500)}`
      };
      await app.db.taskExecutionStep.update({ where: { id: step.id }, data: { status: "succeeded", output: finalOutput, endedAt: new Date() } });
      await app.db.taskExecution.update({ where: { id: execution.id }, data: { status: "succeeded", output: finalOutput, endedAt: new Date() } });
      taskExecutionsTotal.inc({
        connector_id: connectorId,
        tool_name: toolName,
        decision: "allowed",
        reason_code: "POLICY_ALLOWED",
        status: "succeeded",
        risk_level: connector.riskLevel,
        data_classification: connector.dataClassification
      });
      taskExecutionDuration.observe({
        connector_id: connectorId,
        tool_name: toolName,
        decision: "allowed",
        reason_code: "POLICY_ALLOWED",
        status: "succeeded",
        risk_level: connector.riskLevel,
        data_classification: connector.dataClassification
      }, taskDurationSeconds);
      incrementMetric("task_execution_count", { taskId });
      await writeAuditEvent(app.db, {
        actorId: actor(request).id,
        actorType: "user",
        projectId,
        action: "task.execute",
        resourceType: "task",
        resourceId: taskId,
        skillId: requiredSkillId,
        taskId,
        connectorId,
        toolName,
        decision: "allowed",
        reason: "Task execution allowed and completed",
        reasonCode: "POLICY_ALLOWED",
        requestId,
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification,
        metadata: { executionId: execution.id, connectorRuntime: connector.runtimeType }
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
        action: "task.execute",
        resourceType: "task",
        resourceId: taskId,
        skillId: requiredSkillId,
        taskId,
        connectorId,
        toolName,
        decision: "allowed",
        reason: "Task execution allowed but failed during connector execution",
        reasonCode: "CONNECTOR_ERROR",
        requestId,
        riskLevel: connector.riskLevel,
        dataClassification: connector.dataClassification,
        metadata: { executionId: execution.id, error: error.message, connectorRuntime: connector.runtimeType }
      });
      throw error;
    }
    });
  }

  app.post("/gateway/tasks/:taskId/execute", { preHandler: requireActor }, executeTask);
  app.post("/tasks/:id/execute", { preHandler: requireActor }, executeTask);
}
