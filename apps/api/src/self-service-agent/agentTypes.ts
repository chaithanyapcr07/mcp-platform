import type { AuthenticatedActor } from "@mcp-platform/shared-types";

export type AgentIntent =
  | "existing_connector_access_request"
  | "new_connector_onboarding"
  | "connector_tool_execution"
  | "approval_required_action"
  | "registry_lookup"
  | "generated_connector_repo_request"
  | "unsupported_or_ambiguous_request";

export type AgentDecision =
  | "allowed"
  | "approval_required"
  | "access_request_created"
  | "sdd_onboarding_started"
  | "repo_request_created"
  | "unsupported"
  | "planned";

export type ConnectorSystem = "jira" | "servicenow" | "github-enterprise" | "slack" | "confluence" | "unknown";

export interface AgentRequestBody {
  projectId: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface RoutedIntent {
  intent: AgentIntent;
  system?: ConnectorSystem | string;
  workflow?: string;
  connector?: string;
  tool?: string;
  reason?: string;
}

export interface AgentPlan {
  intent: AgentIntent;
  workflow?: string;
  connector?: string;
  tool?: string;
  system?: string;
  decision: AgentDecision;
  nextStep: string;
  status?: string;
  input?: Record<string, unknown>;
  artifacts?: string[];
  requestId?: string;
  reason?: string;
  executionMode: "gateway_only" | "request_only" | "none";
  gatewayResult?: unknown;
}

export interface AgentPlanningInput {
  projectId: string;
  message: string;
  context: Record<string, unknown>;
  actor: AuthenticatedActor;
}

export interface ConnectorSummary {
  id: string;
  status: string;
  riskLevel: string;
  dataClassification: string;
  tools: Array<{
    name: string;
    write: boolean;
    riskLevel: string;
  }>;
}

export interface AgentRegistryResolver {
  findConnector(connectorId: string): Promise<ConnectorSummary | undefined>;
  hasConnector(connectorId: string): Promise<boolean>;
}

export interface AgentPlannerProvider {
  plan(input: AgentPlanningInput): Promise<AgentPlan>;
}
