import { describe, expect, it } from "vitest";
import { assertToolAllowed, defineSkill } from "../src/index.js";

describe("Skill SDK", () => {
  it("validates and enforces allowed tool mappings", () => {
    const skill = defineSkill({
      manifest: {
        id: "kb-search",
        name: "KB Search",
        description: "Search KB",
        ownerTeam: "platform",
        version: "1.0.0",
        status: "approved",
        riskLevel: "low",
        dataClassification: "internal",
        requiredConnectors: ["local-knowledge-base"],
        allowedTools: ["local-knowledge-base.search_items"],
        allowedResources: [],
        allowedPrompts: [],
        requiredPermissions: [],
        approvalRequirements: [],
        policyConstraints: [],
        evals: [],
        examples: []
      },
      plan: []
    });
    expect(() => assertToolAllowed(skill.manifest, "local-knowledge-base", "search_items")).not.toThrow();
  });
});
