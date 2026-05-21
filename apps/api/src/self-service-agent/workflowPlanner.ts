import type { AgentPlannerProvider, AgentPlan, AgentPlanningInput, AgentRegistryResolver } from "./agentTypes.js";
import { routeIntent } from "./intentRouter.js";
import { planToolDecision } from "./approvalPlanner.js";
import { taskMappings } from "./taskMappings.js";

export const sddArtifacts = [
  "requirements.md",
  "design.md",
  "tasks.md",
  "connector.yaml",
  "policy.yaml",
  "README.md",
  ".env.example",
  "Dockerfile",
  "src/server.ts",
  "src/tools/",
  "src/resources/",
  "src/prompts/",
  "src/auth/",
  "tests/",
  "validation-report.md",
  "registration-request.yaml"
];

function inputFor(workflow: string | undefined, context: Record<string, unknown>) {
  if (workflow === "search-jira-issues") {
    return {
      jql: String(context.jql ?? "project = DEMO ORDER BY created DESC"),
      maxResults: Number(context.maxResults ?? 10)
    };
  }
  if (workflow === "create-servicenow-ticket") {
    return {
      shortDescription: String(context.requestSummary ?? "Agent-created ServiceNow request"),
      description: String(context.description ?? context.requestSummary ?? "Created through the governed MCP Gateway."),
      priority: String(context.priority ?? "medium")
    };
  }
  if (workflow === "create-jira-ticket") {
    return {
      projectKey: String(context.projectKey ?? "DEMO"),
      summary: String(context.requestSummary ?? "Agent-created Jira issue"),
      description: String(context.description ?? context.requestSummary ?? "Created through the governed MCP Gateway."),
      issueType: String(context.issueType ?? "Bug")
    };
  }
  return {};
}

export class RuleBasedPlannerProvider implements AgentPlannerProvider {
  constructor(private readonly resolver: AgentRegistryResolver) {}

  async plan(input: AgentPlanningInput): Promise<AgentPlan> {
    const routed = routeIntent(input.message);
    const system = String(routed.system ?? "unknown");

    if (routed.intent === "unsupported_or_ambiguous_request") {
      return {
        intent: routed.intent,
        system,
        decision: "unsupported",
        nextStep: "ask_for_clearer_request",
        reason: routed.reason,
        executionMode: "none"
      };
    }

    if (routed.intent === "registry_lookup") {
      return {
        intent: "registry_lookup",
        system,
        decision: "planned",
        nextStep: "registry_lookup_ready",
        reason: routed.reason,
        executionMode: "none"
      };
    }

    if (routed.intent === "generated_connector_repo_request") {
      return {
        intent: "generated_connector_repo_request",
        system,
        workflow: routed.workflow,
        connector: system !== "unknown" ? `${system}-mcp-connector` : undefined,
        decision: "repo_request_created",
        nextStep: "connector_repo_generation_request_created",
        artifacts: sddArtifacts,
        reason: routed.reason,
        executionMode: "request_only"
      };
    }

    if (routed.intent === "existing_connector_access_request") {
      const connectorExists = routed.connector ? await this.resolver.hasConnector(routed.connector) : false;
      if (connectorExists) {
        return {
          intent: "existing_connector_access_request",
          system,
          connector: routed.connector,
          decision: "access_request_created",
          nextStep: "access_request_created",
          status: "requested",
          reason: routed.reason,
          executionMode: "request_only"
        };
      }
      return {
        intent: "new_connector_onboarding",
        system,
        connector: `${system}-mcp-connector`,
        workflow: system === "servicenow" ? "onboard-servicenow-connector" : `onboard-${system}-connector`,
        decision: "sdd_onboarding_started",
        nextStep: "sdd_onboarding_started",
        artifacts: sddArtifacts,
        reason: "No approved connector was found in the registry; start SDD onboarding.",
        executionMode: "request_only"
      };
    }

    if (routed.intent === "connector_tool_execution") {
      const connector = routed.connector ? await this.resolver.findConnector(routed.connector) : undefined;
      const decision = planToolDecision(connector, routed.workflow, routed.tool);
      return {
        intent: "connector_tool_execution",
        system,
        workflow: routed.workflow,
        connector: routed.connector,
        tool: routed.tool,
        decision,
        nextStep: decision === "approval_required" ? "approval_request_created" : "gateway_invocation_ready",
        input: inputFor(routed.workflow, input.context),
        reason: routed.reason,
        executionMode: "gateway_only"
      };
    }

    return {
      intent: "unsupported_or_ambiguous_request",
      system,
      decision: "unsupported",
      nextStep: "ask_for_clearer_request",
      reason: "The request did not map to a supported self-service MCP workflow.",
      executionMode: "none"
    };
  }
}

export class LlmPlannerProvider implements AgentPlannerProvider {
  async plan(): Promise<AgentPlan> {
    return {
      intent: "unsupported_or_ambiguous_request",
      decision: "unsupported",
      nextStep: "llm_planner_not_configured",
      reason: "LLM planning is intentionally disabled in the local MVP. Use RuleBasedPlannerProvider.",
      executionMode: "none"
    };
  }
}
