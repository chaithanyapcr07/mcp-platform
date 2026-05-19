import { describe, expect, it } from "vitest";
import { defineConnector } from "../src/index.js";

describe("Connector SDK", () => {
  it("registers and invokes a typed tool", async () => {
    const connector = defineConnector({
      id: "sample",
      name: "Sample",
      description: "Sample connector",
      ownerTeam: "platform",
      businessDomain: "engineering",
      connectorType: "mock",
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

    connector.tool({
      name: "echo",
      description: "Echo input",
      inputSchema: {},
      outputSchema: {},
      permissions: [],
      write: false,
      riskLevel: "low"
    }, async (input) => input);

    await expect(connector.invoke("echo", { ok: true }, { requestId: "r1", secrets: {} })).resolves.toEqual({ ok: true });
  });
});
