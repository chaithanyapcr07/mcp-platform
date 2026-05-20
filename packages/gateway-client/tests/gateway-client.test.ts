import { describe, expect, it } from "vitest";
import { McpGatewayClient, McpGatewayError } from "../src/index.js";

describe("McpGatewayClient", () => {
  it("invokes a connector tool through the gateway", async () => {
    const client = new McpGatewayClient({
      gatewayUrl: "http://gateway",
      token: "dev-token",
      projectId: "ai-platform-demo",
      fetchImpl: async (_url, init) => {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({ authorization: "Bearer dev-token" });
        return new Response(JSON.stringify({ requestId: "r1", connectorId: "jira", toolName: "jira.search_issues", output: { total: 1 } }), { status: 200 });
      }
    });

    const result = await client.invokeTool<{ total: number }>("jira", "jira.search_issues", { jql: "project = DEMO" });
    expect(result.output.total).toBe(1);
  });

  it("throws structured errors for denied calls", async () => {
    const client = new McpGatewayClient({
      gatewayUrl: "http://gateway",
      projectId: "ai-platform-demo",
      fetchImpl: async () => new Response(JSON.stringify({ error: "POLICY_DENIED", reason: "Write-capable tools require approval", requestId: "r2" }), { status: 403 })
    });

    await expect(client.invokeTool("jira", "jira.create_issue", {})).rejects.toMatchObject({
      status: 403,
      code: "POLICY_DENIED",
      requestId: "r2"
    } satisfies Partial<McpGatewayError>);
  });
});

