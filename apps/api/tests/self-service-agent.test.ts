import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedActor } from "@mcp-platform/shared-types";
import { routeIntent } from "../src/self-service-agent/intentRouter.js";
import { RuleBasedPlannerProvider } from "../src/self-service-agent/workflowPlanner.js";
import { writeAgentDecisionAudit } from "../src/self-service-agent/agentAudit.js";
import type { AgentRegistryResolver, ConnectorSummary } from "../src/self-service-agent/agentTypes.js";

const actor: AuthenticatedActor = {
  id: "u-dev",
  email: "developer@example.com",
  name: "Project Developer",
  teamIds: ["ai-platform"],
  roles: ["project_developer"],
  permissions: ["connector:execute", "tool:execute"]
};

const connectors: Record<string, ConnectorSummary> = {
  jira: {
    id: "jira",
    status: "approved",
    riskLevel: "high",
    dataClassification: "confidential",
    tools: [
      { name: "jira.search_issues", write: false, riskLevel: "low" },
      { name: "jira.create_issue", write: true, riskLevel: "high" }
    ]
  },
  servicenow: {
    id: "servicenow",
    status: "approved",
    riskLevel: "high",
    dataClassification: "confidential",
    tools: [
      { name: "servicenow.search_incidents", write: false, riskLevel: "low" },
      { name: "servicenow.create_incident", write: true, riskLevel: "high" }
    ]
  }
};

const resolver: AgentRegistryResolver = {
  async findConnector(connectorId) {
    return connectors[connectorId];
  },
  async hasConnector(connectorId) {
    return Boolean(connectors[connectorId]);
  }
};

function planner() {
  return new RuleBasedPlannerProvider(resolver);
}

describe("self-service agent orchestrator", () => {
  it("classifies ServiceNow onboarding requests", () => {
    expect(routeIntent("Can you help me onboard to the ServiceNow connector?")).toMatchObject({
      intent: "existing_connector_access_request",
      system: "servicenow"
    });
  });

  it("classifies Jira access requests", () => {
    expect(routeIntent("I need Jira access for my incident-response agent.")).toMatchObject({
      intent: "existing_connector_access_request",
      connector: "jira"
    });
  });

  it("maps search Jira issues to jira.search_issues", async () => {
    const plan = await planner().plan({
      projectId: "ai-platform-demo",
      message: "Can you search Jira issues for project DEMO?",
      context: {},
      actor
    });
    expect(plan).toMatchObject({
      intent: "connector_tool_execution",
      workflow: "search-jira-issues",
      connector: "jira",
      tool: "jira.search_issues",
      decision: "allowed",
      executionMode: "gateway_only"
    });
  });

  it("maps create ServiceNow ticket to servicenow.create_incident", async () => {
    const plan = await planner().plan({
      projectId: "ai-platform-demo",
      message: "Can you create a ServiceNow ticket for this request?",
      context: { requestSummary: "Claims dashboard is unavailable" },
      actor
    });
    expect(plan).toMatchObject({
      intent: "connector_tool_execution",
      workflow: "create-servicenow-ticket",
      connector: "servicenow",
      tool: "servicenow.create_incident"
    });
  });

  it("returns approval_required for ServiceNow write actions", async () => {
    const plan = await planner().plan({
      projectId: "ai-platform-demo",
      message: "Can you create a ServiceNow ticket for this request?",
      context: {},
      actor
    });
    expect(plan.decision).toBe("approval_required");
    expect(plan.nextStep).toBe("approval_request_created");
  });

  it("does not directly invoke connectors for approval-required actions", async () => {
    const plan = await planner().plan({
      projectId: "ai-platform-demo",
      message: "Can you create a ServiceNow ticket for this request?",
      context: {},
      actor
    });
    expect(plan.executionMode).toBe("gateway_only");
    expect(plan.gatewayResult).toBeUndefined();
  });

  it("creates an audit event for agent decisions", async () => {
    const create = vi.fn(async ({ data }) => ({ ...data, id: "audit-1", timestamp: new Date() }));
    const fakeDb = { auditEvent: { create } } as any;
    const plan = await planner().plan({
      projectId: "ai-platform-demo",
      message: "Can you search Jira issues?",
      context: {},
      actor
    });
    await writeAgentDecisionAudit(fakeDb, actor, "ai-platform-demo", plan, "req-1");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "agent.request",
        connectorId: "jira",
        toolName: "jira.search_issues",
        requestId: "req-1",
        reasonCode: "AGENT_INTENT_ROUTED"
      })
    }));
  });

  it("returns unsupported_or_ambiguous_request for unknown input", async () => {
    const plan = await planner().plan({
      projectId: "ai-platform-demo",
      message: "Please do the thing with the system",
      context: {},
      actor
    });
    expect(plan).toMatchObject({
      intent: "unsupported_or_ambiguous_request",
      decision: "unsupported",
      nextStep: "ask_for_clearer_request"
    });
  });
});
