import type { AuthenticatedActor } from "@mcp-platform/shared-types";
import type { DbClient } from "../db/client.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AgentPlan } from "./agentTypes.js";

export async function writeAgentDecisionAudit(
  db: DbClient,
  actor: AuthenticatedActor,
  projectId: string,
  plan: AgentPlan,
  requestId: string
) {
  const reasonCode = plan.decision === "approval_required"
    ? "AGENT_APPROVAL_REQUIRED"
    : plan.intent === "unsupported_or_ambiguous_request"
      ? "AGENT_UNSUPPORTED"
      : "AGENT_INTENT_ROUTED";

  return writeAuditEvent(db, {
    actorId: actor.id,
    actorType: "user",
    projectId,
    action: "agent.request",
    resourceType: "self_service_agent",
    resourceId: plan.workflow ?? plan.intent,
    connectorId: plan.connector,
    toolName: plan.tool,
    decision: plan.intent === "unsupported_or_ambiguous_request" ? "denied" : "allowed",
    reason: plan.reason ?? "Self-service agent routed request",
    reasonCode,
    requestId,
    metadata: {
      intent: plan.intent,
      workflow: plan.workflow,
      nextStep: plan.nextStep,
      executionMode: plan.executionMode
    }
  });
}
