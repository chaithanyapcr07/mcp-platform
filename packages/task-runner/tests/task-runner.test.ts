import { describe, expect, it } from "vitest";
import { TaskRunner } from "../src/index.js";

describe("TaskRunner", () => {
  it("runs steps and emits audit hooks", async () => {
    const seen: string[] = [];
    const runner = new TaskRunner({
      executeSkill: async (step) => ({ action: step.action }),
      audit: async (step) => {
        seen.push(step.id);
      }
    });
    const result = await runner.run({
      manifest: {
        id: "task",
        name: "Task",
        description: "Task",
        ownerTeam: "platform",
        version: "1.0.0",
        status: "approved",
        requiredSkills: ["skill"],
        inputSchema: {},
        outputSchema: {},
        executionConstraints: {},
        approvalBehavior: "none",
        policyConstraints: [],
        auditRequirements: [],
        testCases: []
      },
      steps: [{ id: "s1", skillId: "skill", action: "run", input: {} }]
    });
    expect(result.s1).toEqual({ action: "run" });
    expect(seen).toEqual(["s1"]);
  });
});
