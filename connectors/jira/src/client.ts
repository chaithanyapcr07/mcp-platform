import { jiraAuthHeaders, type JiraAuthConfig } from "./auth/jiraAuth.js";
import { createMockIssue, getMockIssue, searchMockIssues } from "./mockJira.js";
import type { AddCommentInput, CreateIssueInput, GetIssueInput, SearchIssuesInput, TransitionIssueInput } from "./types.js";

export class JiraClient {
  constructor(private readonly config: JiraAuthConfig) {}

  async searchIssues(input: SearchIssuesInput) {
    if (this.config.mode === "mock") {
      const issues = searchMockIssues(input.jql, input.maxResults);
      return { issues, total: issues.length, mode: "mock" };
    }
    const response = await this.request("/rest/api/3/search", {
      method: "POST",
      body: JSON.stringify({
        jql: input.jql,
        maxResults: input.maxResults ?? 10,
        fields: ["summary", "description", "status", "issuetype", "project", "priority", "labels", "created", "updated"]
      })
    });
    return { ...response, mode: "api_token" };
  }

  async getIssue(input: GetIssueInput) {
    if (this.config.mode === "mock") {
      const issue = getMockIssue(input.issueKey);
      if (!issue) throw Object.assign(new Error(`Issue ${input.issueKey} not found`), { statusCode: 404 });
      return { issue, mode: "mock" };
    }
    const issue = await this.request(`/rest/api/3/issue/${encodeURIComponent(input.issueKey)}`, { method: "GET" });
    return { issue, mode: "api_token" };
  }

  async createIssue(input: CreateIssueInput) {
    if (this.config.mode === "mock") {
      return { issue: createMockIssue(input), mode: "mock" };
    }
    const issue = await this.request("/rest/api/3/issue", {
      method: "POST",
      body: JSON.stringify({
        fields: {
          project: { key: input.projectKey },
          summary: input.summary,
          description: input.description,
          issuetype: { name: input.issueType ?? "Bug" },
          priority: input.priority ? { name: input.priority } : undefined,
          labels: input.labels
        }
      })
    });
    return { issue, mode: "api_token" };
  }

  async addComment(input: AddCommentInput) {
    if (this.config.mode === "mock") {
      const issue = getMockIssue(input.issueKey);
      if (!issue) throw Object.assign(new Error(`Issue ${input.issueKey} not found`), { statusCode: 404 });
      issue.comments.push({ body: input.comment, created: new Date().toISOString() });
      return { issueKey: input.issueKey, commentAdded: true, mode: "mock" };
    }
    const comment = await this.request(`/rest/api/3/issue/${encodeURIComponent(input.issueKey)}/comment`, {
      method: "POST",
      body: JSON.stringify({ body: input.comment })
    });
    return { comment, mode: "api_token" };
  }

  async transitionIssue(input: TransitionIssueInput) {
    if (this.config.mode === "mock") {
      const issue = getMockIssue(input.issueKey);
      if (!issue) throw Object.assign(new Error(`Issue ${input.issueKey} not found`), { statusCode: 404 });
      issue.fields.status.name = input.transitionName;
      issue.fields.updated = new Date().toISOString();
      return { issueKey: input.issueKey, status: input.transitionName, mode: "mock" };
    }
    const transitions = await this.request(`/rest/api/3/issue/${encodeURIComponent(input.issueKey)}/transitions`, { method: "GET" });
    const transition = transitions.transitions?.find((entry: any) => entry.name === input.transitionName);
    if (!transition) throw Object.assign(new Error(`Transition ${input.transitionName} not found`), { statusCode: 404 });
    await this.request(`/rest/api/3/issue/${encodeURIComponent(input.issueKey)}/transitions`, {
      method: "POST",
      body: JSON.stringify({ transition: { id: transition.id } })
    });
    return { issueKey: input.issueKey, status: input.transitionName, mode: "api_token" };
  }

  private async request(path: string, init: RequestInit) {
    if (!this.config.baseUrl) throw new Error("Jira base URL is not configured");
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        ...jiraAuthHeaders(this.config),
        ...(init.headers ?? {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(payload.errorMessages?.join(", ") || payload.message || "Jira API request failed"), {
        statusCode: response.status,
        payload
      });
    }
    return payload;
  }
}
