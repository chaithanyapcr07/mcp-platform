export const taskMappings: Record<string, {
  connector?: string;
  tool?: string;
  type?: "read" | "write";
  workflow?: string;
  defaultDecision: "allowed_if_project_has_access" | "approval_required" | "review_required";
}> = {
  "search-jira-issues": {
    connector: "jira",
    tool: "jira.search_issues",
    type: "read",
    defaultDecision: "allowed_if_project_has_access"
  },
  "create-jira-ticket": {
    connector: "jira",
    tool: "jira.create_issue",
    type: "write",
    defaultDecision: "approval_required"
  },
  "create-servicenow-ticket": {
    connector: "servicenow",
    tool: "servicenow.create_incident",
    type: "write",
    defaultDecision: "approval_required"
  },
  "onboard-servicenow-connector": {
    workflow: "sdd_connector_onboarding",
    defaultDecision: "review_required"
  }
};
