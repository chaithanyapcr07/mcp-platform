import type { JiraClient } from "../client.js";

export const issueResource = {
  name: "jira_issue",
  uri: "jira://issues/{issueKey}",
  description: "Read-only Jira issue resource."
};

export async function readIssueResource(client: JiraClient, uri: string) {
  const issueKey = uri.replace("jira://issues/", "");
  return client.getIssue({ issueKey });
}
