import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireActor } from "../auth/auth.js";
import { forbidden } from "../errors.js";
import { policyEvaluator } from "./policy.service.js";
import { getConnectorManifest, getSkillManifest, getTaskManifest } from "../registry/registry.service.js";

function actor(request: any) {
  if (!request.actor) throw forbidden("Authenticated actor required");
  return request.actor;
}

const simulateSchema = z.object({
  projectId: z.string().min(1),
  connectorId: z.string().min(1),
  toolName: z.string().min(1),
  skillId: z.string().optional(),
  taskId: z.string().optional(),
  hasProjectConnectorAccess: z.boolean().default(false),
  hasProjectSkillAccess: z.boolean().default(true),
  hasProjectTaskAccess: z.boolean().default(true),
  hasExplicitRestrictedApproval: z.boolean().default(false),
  hasWriteAccess: z.boolean().default(false)
});

export async function registerPolicyRoutes(app: FastifyInstance) {
  app.post("/policy/simulate", { preHandler: requireActor }, async (request: any) => {
    const body = simulateSchema.parse(request.body);
    const connector = await getConnectorManifest(app.db, body.connectorId);
    const tool = connector.tools.find((entry) => entry.name === body.toolName);
    const skill = body.skillId ? await getSkillManifest(app.db, body.skillId) : undefined;
    const task = body.taskId ? await getTaskManifest(app.db, body.taskId) : undefined;

    const decision = policyEvaluator.evaluateConnectorTool({
      actor: actor(request),
      projectId: body.projectId,
      connector,
      tool,
      skill,
      task,
      hasProjectConnectorAccess: body.hasProjectConnectorAccess,
      hasProjectSkillAccess: body.hasProjectSkillAccess,
      hasProjectTaskAccess: body.hasProjectTaskAccess,
      hasExplicitRestrictedApproval: body.hasExplicitRestrictedApproval,
      hasWriteAccess: body.hasWriteAccess,
      requestId: request.id
    });

    return {
      input: body,
      decision,
      explanation: decision.reason
    };
  });
}

