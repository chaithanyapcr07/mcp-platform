import { describe, expect, it } from "vitest";
import { PolicyEvaluator } from "../src/index.js";
import type { AuthenticatedActor, ConnectorManifest, ToolCapability } from "@mcp-platform/shared-types";

const actor: AuthenticatedActor = {
  id: "u1",
  email: "dev@example.com",
  name: "Dev",
  teamIds: ["platform"],
  roles: ["project_developer"],
  permissions: ["connector:execute", "tool:execute", "skill:execute", "task:execute", "kb:read"]
};

const connector: ConnectorManifest = {
  id: "local-knowledge-base",
  name: "Local KB",
  description: "Safe KB",
  ownerTeam: "platform",
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
};

const tool: ToolCapability = {
  name: "search_items",
  description: "Search",
  inputSchema: {},
  outputSchema: {},
  permissions: ["kb:read"],
  write: false,
  riskLevel: "low"
};

describe("PolicyEvaluator", () => {
  it("allows approved connector access with required tool permission", () => {
    const evaluator = new PolicyEvaluator();
    const result = evaluator.evaluateConnectorTool({
      actor,
      connector,
      tool,
      hasProjectConnectorAccess: true,
      hasWriteAccess: false,
      requestId: "r1"
    });
    expect(result.decision).toBe("allowed");
  });

  it("denies disabled connectors", () => {
    const evaluator = new PolicyEvaluator();
    const result = evaluator.evaluateConnectorTool({
      actor,
      connector: { ...connector, status: "disabled" },
      tool,
      hasProjectConnectorAccess: true,
      requestId: "r1"
    });
    expect(result.decision).toBe("denied");
    expect(result.reason).toContain("disabled");
  });
});
