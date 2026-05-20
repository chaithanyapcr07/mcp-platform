import { describe, expect, it } from "vitest";
import { connectorManifestSchema, skillManifestSchema, taskManifestSchema } from "@mcp-platform/shared-types";
import { PolicyEvaluator } from "@mcp-platform/policy-core";
import { rolePermissions } from "../src/rbac/rbac.service.js";
import { LocalMockSecretProvider } from "../src/secrets/secret-provider.js";

const actor = {
  id: "u-dev",
  email: "developer@example.com",
  name: "Project Developer",
  teamIds: ["ai-platform"],
  roles: ["project_developer"],
  permissions: ["connector:execute", "skill:execute", "task:execute", "tool:execute", "kb:read"]
};

const connector = connectorManifestSchema.parse({
  id: "local-knowledge-base",
  name: "Local Knowledge Base",
  description: "Safe KB",
  ownerTeam: "ai-platform",
  businessDomain: "engineering",
  connectorType: "knowledge_base",
  version: "1.0.0",
  status: "approved",
  runtimeType: "managed",
  authType: "none",
  requiredScopes: [],
  tools: [],
  resources: [],
  prompts: [],
  riskLevel: "low",
  dataClassification: "internal"
});

const jiraConnector = connectorManifestSchema.parse({
  id: "jira",
  name: "Jira MCP Connector",
  description: "Governed Jira",
  ownerTeam: "ai-platform",
  businessDomain: "engineering",
  connectorType: "issue_tracker",
  version: "0.1.0",
  status: "approved",
  runtimeType: "managed",
  authType: "api_token",
  requiredScopes: ["read:jira-work", "write:jira-work"],
  tools: [],
  resources: [],
  prompts: [],
  riskLevel: "high",
  dataClassification: "confidential"
});

const tool = {
  name: "search_items",
  description: "Search",
  inputSchema: {},
  outputSchema: {},
  permissions: ["kb:read"],
  write: false,
  riskLevel: "low" as const
};

const jiraSearchTool = {
  name: "jira.search_issues",
  description: "Search Jira issues",
  inputSchema: {},
  outputSchema: {},
  permissions: ["tool:execute"],
  write: false,
  riskLevel: "low" as const
};

const jiraCreateTool = {
  name: "jira.create_issue",
  description: "Create Jira issue",
  inputSchema: {},
  outputSchema: {},
  permissions: ["tool:execute"],
  write: true,
  riskLevel: "high" as const
};

describe("MCP Platform controls", () => {
  it("validates connector registration manifests", () => {
    expect(connector.id).toBe("local-knowledge-base");
  });

  it("validates skill registration and approval workflow manifests", () => {
    const skill = skillManifestSchema.parse({
      id: "knowledge-base-search",
      name: "Knowledge Base Search",
      description: "Search KB",
      ownerTeam: "ai-platform",
      version: "1.0.0",
      status: "approved",
      riskLevel: "low",
      dataClassification: "internal",
      requiredConnectors: ["local-knowledge-base"],
      allowedTools: ["local-knowledge-base.search_items"],
      allowedResources: [],
      allowedPrompts: [],
      requiredPermissions: ["kb:read"],
      approvalRequirements: [],
      policyConstraints: [],
      evals: [],
      examples: []
    });
    expect(skill.status).toBe("approved");
  });

  it("validates task registration and approval workflow manifests", () => {
    const task = taskManifestSchema.parse({
      id: "search-runbook-and-draft-response",
      name: "Search Runbook",
      description: "Search runbook",
      ownerTeam: "ai-platform",
      version: "1.0.0",
      status: "approved",
      requiredSkills: ["knowledge-base-search"],
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      executionConstraints: { timeoutSeconds: 30 },
      approvalBehavior: "none",
      policyConstraints: [],
      auditRequirements: ["task_execution"],
      testCases: []
    });
    expect(task.requiredSkills).toContain("knowledge-base-search");
  });

  it("checks RBAC permissions for project connector, skill, and task access", () => {
    expect(rolePermissions.project_developer).toEqual(expect.arrayContaining(["connector:execute", "skill:execute", "task:execute", "tool:execute"]));
  });

  it("allows authorized gateway tool invocation decisions", () => {
    const result = new PolicyEvaluator().evaluateConnectorTool({
      actor,
      connector,
      tool,
      hasProjectConnectorAccess: true,
      hasWriteAccess: false,
      requestId: "r1"
    });
    expect(result.decision).toBe("allowed");
  });

  it("denies disabled connector invocation decisions with a reason", () => {
    const result = new PolicyEvaluator().evaluateConnectorTool({
      actor,
      connector: { ...connector, status: "disabled" },
      tool,
      hasProjectConnectorAccess: true,
      requestId: "r1"
    });
    expect(result).toMatchObject({ decision: "denied" });
    expect(result.reason).toContain("disabled");
  });

  it("requires approval for high-risk write actions", () => {
    const result = new PolicyEvaluator().evaluateConnectorTool({
      actor: { ...actor, permissions: [...actor.permissions, "kb:write"] },
      connector: { ...connector, riskLevel: "high" },
      tool: { ...tool, name: "create_item", permissions: ["kb:write"], write: true, riskLevel: "high" },
      hasProjectConnectorAccess: true,
      hasExplicitRestrictedApproval: true,
      hasWriteAccess: true,
      requestId: "r1"
    });
    expect(result.decision).toBe("requires_approval");
  });

  it("enforces secret reference behavior", async () => {
    const provider = new LocalMockSecretProvider();
    await expect(provider.resolve({
      secretRef: "local/kb/api-key",
      secretProvider: "local_mock",
      secretVersion: "v1",
      allowedRuntimeIdentity: "mcp-gateway-local",
      rotationStatus: "current"
    }, "wrong-runtime")).rejects.toThrow("Runtime identity");
  });

  it("models project connector, skill, and task access decisions separately", () => {
    const evaluator = new PolicyEvaluator();
    const missingProjectAccess = evaluator.evaluateConnectorTool({
      actor,
      connector,
      tool,
      hasProjectConnectorAccess: false,
      hasWriteAccess: false,
      requestId: "r1"
    });
    expect(missingProjectAccess).toMatchObject({
      decision: "denied",
      reason: "Project does not have access to connector local-knowledge-base"
    });
  });

  it("requires task execution access before running task workflows", () => {
    const result = new PolicyEvaluator().evaluateTask({
      actor,
      task: {
        id: "search-runbook-and-draft-response",
        name: "Search Runbook",
        description: "Search runbook",
        ownerTeam: "ai-platform",
        version: "1.0.0",
        status: "approved",
        requiredSkills: ["knowledge-base-search"],
        inputSchema: {},
        outputSchema: {},
        executionConstraints: {},
        approvalBehavior: "none",
        policyConstraints: [],
        auditRequirements: [],
        testCases: []
      },
      hasProjectTaskAccess: false,
      requestId: "r1"
    });
    expect(result).toMatchObject({
      decision: "denied",
      reason: "Project does not have approved task access"
    });
  });

  it("allows Jira search when project has explicit high-risk connector access", () => {
    const result = new PolicyEvaluator().evaluateConnectorTool({
      actor,
      connector: jiraConnector,
      tool: jiraSearchTool,
      hasProjectConnectorAccess: true,
      hasExplicitRestrictedApproval: true,
      hasWriteAccess: false,
      requestId: "r1"
    });
    expect(result.decision).toBe("allowed");
  });

  it("denies Jira search when project access is missing", () => {
    const result = new PolicyEvaluator().evaluateConnectorTool({
      actor,
      connector: jiraConnector,
      tool: jiraSearchTool,
      hasProjectConnectorAccess: false,
      hasExplicitRestrictedApproval: false,
      hasWriteAccess: false,
      requestId: "r1"
    });
    expect(result).toMatchObject({ decision: "denied" });
  });

  it("requires approval for Jira write tools", () => {
    const result = new PolicyEvaluator().evaluateConnectorTool({
      actor,
      connector: jiraConnector,
      tool: jiraCreateTool,
      hasProjectConnectorAccess: true,
      hasExplicitRestrictedApproval: true,
      hasWriteAccess: true,
      requestId: "r1"
    });
    expect(result.decision).toBe("requires_approval");
  });

  it("routes write tools without project write access into approval instead of direct execution", () => {
    const result = new PolicyEvaluator().evaluateConnectorTool({
      actor,
      connector: jiraConnector,
      tool: jiraCreateTool,
      hasProjectConnectorAccess: true,
      hasExplicitRestrictedApproval: true,
      hasWriteAccess: false,
      requestId: "r1"
    });
    expect(result).toMatchObject({
      decision: "requires_approval",
      requiredApproval: "write_tool_approval"
    });
  });
});
