import type { PolicyDecision, PolicyInput } from "@mcp-platform/shared-types";

const allow = (reason = "Policy allowed request"): PolicyDecision => ({ decision: "allowed", reason });
const deny = (reason: string): PolicyDecision => ({ decision: "denied", reason });
const approval = (reason: string, requiredApproval: string): PolicyDecision => ({
  decision: "requires_approval",
  reason,
  requiredApproval
});

export class PolicyEvaluator {
  evaluateConnectorTool(input: PolicyInput): PolicyDecision {
    const { actor, connector, skill, task, tool } = input;
    if (!connector) return deny("Connector was not found");
    if (!tool) return deny("Tool was not found on connector");
    if (connector.status !== "approved") return deny(`Connector status ${connector.status} is not executable`);
    if (!actor.permissions.includes("connector:execute")) return deny("Actor lacks connector:execute");
    if (!actor.permissions.includes("tool:execute")) return deny("Actor lacks tool:execute");
    for (const permission of tool.permissions) {
      if (!actor.permissions.includes(permission)) return deny(`Actor lacks tool permission ${permission}`);
    }
    if (!input.hasProjectConnectorAccess) return deny("Project does not have approved connector access");
    if (skill) {
      const decision = this.evaluateSkill(input);
      if (decision.decision !== "allowed") return decision;
      if (!skill.allowedTools.includes(tool.name) && !skill.allowedTools.includes(`${connector.id}.${tool.name}`)) {
        return deny("Tool is not allowed by skill definition");
      }
    }
    if (task) {
      const decision = this.evaluateTask(input);
      if (decision.decision !== "allowed") return decision;
    }
    if ((connector.riskLevel === "high" || connector.riskLevel === "critical") && !input.hasExplicitRestrictedApproval) {
      return deny("High-risk connector requires explicit project approval");
    }
    if (connector.dataClassification === "restricted" && !input.hasExplicitRestrictedApproval) {
      return deny("Restricted data connector requires explicit project approval");
    }
    if (tool.write && !input.hasWriteAccess) {
      return deny("Write-capable tools require explicit project write access");
    }
    if (tool.write && (tool.riskLevel === "high" || connector.riskLevel === "high")) {
      return approval("High-risk write action requires human approval", "security_review");
    }
    return allow();
  }

  evaluateSkill(input: PolicyInput): PolicyDecision {
    const { actor, skill } = input;
    if (!skill) return deny("Skill was not found");
    if (skill.status !== "approved") return deny(`Skill status ${skill.status} is not executable`);
    if (!actor.permissions.includes("skill:execute")) return deny("Actor lacks skill:execute");
    if (!input.hasProjectSkillAccess) return deny("Project does not have approved skill access");
    if (skill.dataClassification === "restricted" && !input.hasExplicitRestrictedApproval) {
      return deny("Restricted data skill requires explicit project approval");
    }
    return allow("Skill policy allowed request");
  }

  evaluateTask(input: PolicyInput): PolicyDecision {
    const { actor, task } = input;
    if (!task) return deny("Task was not found");
    if (task.status !== "approved") return deny(`Task status ${task.status} is not executable`);
    if (!actor.permissions.includes("task:execute")) return deny("Actor lacks task:execute");
    if (!input.hasProjectTaskAccess) return deny("Project does not have approved task access");
    if (task.approvalBehavior === "required") {
      return approval("Task approval behavior requires human approval", "task_owner_review");
    }
    return allow("Task policy allowed request");
  }

  evaluateRegistryMutation(actorPermissions: string[], permission: string): PolicyDecision {
    return actorPermissions.includes(permission) ? allow() : deny(`Actor lacks ${permission}`);
  }
}
