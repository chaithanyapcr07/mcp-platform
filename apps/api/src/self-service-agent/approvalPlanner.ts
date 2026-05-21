import type { AgentDecision, ConnectorSummary } from "./agentTypes.js";
import { taskMappings } from "./taskMappings.js";

export function planToolDecision(connector: ConnectorSummary | undefined, workflow: string | undefined, toolName: string | undefined): AgentDecision {
  const mappingDecision = workflow ? taskMappings[workflow]?.defaultDecision : undefined;
  if (mappingDecision === "approval_required") return "approval_required";
  if (!toolName) return "planned";
  const tool = connector?.tools.find((entry) => entry.name === toolName);
  if (tool?.write || tool?.riskLevel === "high" || tool?.riskLevel === "critical") return "approval_required";
  return "allowed";
}
