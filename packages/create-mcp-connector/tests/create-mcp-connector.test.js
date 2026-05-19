import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateConnector } from "../src/index.js";

describe("create-mcp-connector", () => {
  it("generates a connector scaffold with required onboarding files", () => {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-connector-"));
    const target = generateConnector({
      name: "my-jira-connector",
      template: "jira-like-issue-tracker",
      output
    });
    for (const file of [
      "connector.yaml",
      "README.md",
      ".env.example",
      "Dockerfile",
      "src/server.ts",
      "src/tools/exampleTool.ts",
      "src/resources/exampleResource.ts",
      "src/prompts/starterPrompt.ts",
      "src/auth/authConfig.ts",
      "tests/connector.test.ts",
      "fixtures/sample-request.json"
    ]) {
      expect(fs.existsSync(path.join(target, file))).toBe(true);
    }
  });
});
