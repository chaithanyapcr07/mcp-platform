import { devToken, printJson, request } from "./demo-utils.mjs";

const developerToken = process.env.DEV_TOKEN ?? await devToken("developer@example.com");
const requestId = `demo-jira-approved-write-${Date.now()}`;

const denied = await request("/gateway/connectors/jira/tools/jira.create_issue/invoke", {
  method: "POST",
  headers: {
    authorization: `Bearer ${developerToken}`,
    "x-correlation-id": requestId
  },
  body: JSON.stringify({
    projectId: "ai-platform-demo",
    input: {
      projectKey: "DEMO",
      summary: "Approved write demo",
      description: "Created after explicit approval resume flow."
    }
  })
});

if (denied.response.status !== 409) {
  printJson("Expected approval_required response but received", denied.body);
  process.exit(1);
}

const adminToken = process.env.ADMIN_TOKEN ?? await devToken("admin@example.com");
const approvals = await request("/approvals?status=pending&resourceType=tool_execution", {
  headers: { authorization: `Bearer ${adminToken}` }
});
const approval = approvals.body.find((item) => item.requestId === requestId);
if (!approval) {
  printJson("Pending approvals", approvals.body);
  throw new Error(`No approval found for request ${requestId}`);
}

const approved = await request(`/approvals/${approval.id}/approve`, {
  method: "POST",
  headers: { authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({ reason: "Approved demo write action" })
});
if (!approved.response.ok) {
  printJson("Approval failed", approved.body);
  process.exit(1);
}

const executed = await request(`/approvals/${approval.id}/execute`, {
  method: "POST",
  headers: { authorization: `Bearer ${adminToken}` }
});
if (!executed.response.ok) {
  printJson("Approved execution failed", executed.body);
  process.exit(1);
}

printJson("Approval-required response", denied.body);
printJson("Approved record", approved.body);
printJson("Resumed execution result", executed.body);
