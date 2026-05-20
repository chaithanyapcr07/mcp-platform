import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

describe("self-service onboarding artifacts", () => {
  it("keeps connector manifests ownership-aware", () => {
    const jira = read("registry/connectors/jira.yaml");
    const servicenow = read("registry/connectors/servicenow-distributed-example.yaml");

    for (const manifest of [jira, servicenow]) {
      expect(manifest).toContain("owner_team:");
      expect(manifest).toContain("runtime_owner:");
      expect(manifest).toContain("business_owner:");
      expect(manifest).toContain("security_reviewer:");
      expect(manifest).toContain("deployment_mode:");
      expect(manifest).toContain("support_channel:");
      expect(manifest).toContain("on_call_rotation:");
    }
  });

  it("contains write-action approval policy defaults", () => {
    const policy = read("registry/policies/write-action-approval-policy.yaml");

    expect(policy).toContain("default_decision_for_write_tools: approval_required");
    expect(policy).toContain("jira.create_issue");
    expect(policy).toContain("servicenow.create_incident");
    expect(policy).toContain("servicenow.update_incident");
  });

  it("includes SDD files and runtime scaffold in the generated ServiceNow repo", () => {
    const requiredFiles = [
      "requirements.md",
      "design.md",
      "tasks.md",
      "connector.yaml",
      "policy.yaml",
      "README.md",
      ".env.example",
      "Dockerfile",
      "src/server.ts",
      "src/tools/createIncident.ts",
      "src/tools/getIncident.ts",
      "src/tools/searchIncidents.ts",
      "src/tools/updateIncident.ts",
      "src/resources/incidentResource.ts",
      "src/prompts/incidentTriagePrompt.ts",
      "src/auth/serviceNowAuth.ts",
      "tests/connector.test.ts",
      "validation-report.md",
      "registration-request.yaml"
    ];

    for (const file of requiredFiles) {
      expect(exists(`generated-repos/servicenow-mcp-connector/${file}`)).toBe(true);
    }
  });

  it("marks generated write tools approval_required by default", () => {
    const generatedPolicy = read("generated-repos/servicenow-mcp-connector/policy.yaml");
    const generatedManifest = read("generated-repos/servicenow-mcp-connector/connector.yaml");

    expect(generatedPolicy).toContain("write_tools: approval_required");
    expect(generatedManifest).toContain("servicenow.create_incident");
    expect(generatedManifest).toContain("requires_human_approval: true");
  });

  it("includes required registration request ownership fields", () => {
    const registration = read("generated-repos/servicenow-mcp-connector/registration-request.yaml");

    for (const field of [
      "owner_team:",
      "runtime_owner:",
      "security_reviewer:",
      "deployment_mode:",
      "data_classification:",
      "requested_tools:"
    ]) {
      expect(registration).toContain(field);
    }
  });

  it("keeps self-service request examples complete", () => {
    const requests = [
      read("registry/requests/examples/existing-connector-access-request.yaml"),
      read("registry/requests/examples/new-connector-registration-request.yaml"),
      read("registry/requests/examples/agent-assisted-onboarding-request.yaml")
    ];

    for (const request of requests) {
      for (const field of [
        "requester:",
        "project_id:",
        "team:",
        "requested_tools:",
        "read_or_write_intent:",
        "business_justification:",
        "data_classification:",
        "expected_volume:",
        "approval_required:",
        "approvers:",
        "status:"
      ]) {
        expect(request).toContain(field);
      }
      expect(request).not.toMatch(/\t/);
    }
  });
});
