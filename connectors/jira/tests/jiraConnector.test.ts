import { describe, expect, it } from "vitest";
import { JiraClient } from "../src/client.js";

describe("Jira connector mock mode", () => {
  const client = new JiraClient({ mode: "mock" });

  it("searches issues in mock mode", async () => {
    const result = await client.searchIssues({ jql: "project = DEMO ORDER BY created DESC", maxResults: 10 });
    expect(result.mode).toBe("mock");
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("creates and reads an issue in mock mode", async () => {
    const created = await client.createIssue({
      projectKey: "DEMO",
      summary: "Generated bug from incident",
      description: "Created by the MCP onboarding path",
      issueType: "Bug"
    });
    const read = await client.getIssue({ issueKey: created.issue.key });
    expect(read.issue.fields.summary).toBe("Generated bug from incident");
  });
});
