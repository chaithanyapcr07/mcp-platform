import type { JiraIssue } from "./types.js";

const now = new Date().toISOString();

export const mockIssues: JiraIssue[] = [
  {
    key: "DEMO-101",
    fields: {
      summary: "Checkout fails when payment provider times out",
      description: "Customers see a generic error when the payment provider times out during checkout.",
      status: { name: "To Do" },
      issuetype: { name: "Bug" },
      project: { key: "DEMO" },
      priority: { name: "High" },
      labels: ["incident", "checkout"],
      created: now,
      updated: now
    },
    comments: []
  },
  {
    key: "DEMO-102",
    fields: {
      summary: "Add runbook link to checkout alert",
      description: "Alert payload should include the checkout incident runbook URL.",
      status: { name: "In Progress" },
      issuetype: { name: "Task" },
      project: { key: "DEMO" },
      priority: { name: "Medium" },
      labels: ["observability"],
      created: now,
      updated: now
    },
    comments: [{ body: "Linked to incident INC-123.", created: now }]
  }
];

export function searchMockIssues(jql: string, maxResults = 10): JiraIssue[] {
  const normalized = jql.toLowerCase();
  const projectMatch = /project\s*=\s*([a-z0-9_-]+)/i.exec(jql)?.[1]?.toUpperCase();
  return mockIssues
    .filter((issue) => !projectMatch || issue.fields.project.key === projectMatch)
    .filter((issue) =>
      normalized.includes("order by") ||
      issue.key.toLowerCase().includes(normalized) ||
      issue.fields.summary.toLowerCase().includes(normalized) ||
      issue.fields.description?.toLowerCase().includes(normalized) ||
      issue.fields.labels?.some((label) => normalized.includes(label))
    )
    .slice(0, maxResults);
}

export function getMockIssue(issueKey: string): JiraIssue | undefined {
  return mockIssues.find((issue) => issue.key === issueKey);
}

export function createMockIssue(input: {
  projectKey: string;
  summary: string;
  description?: string;
  issueType?: string;
  priority?: string;
  labels?: string[];
}): JiraIssue {
  const nextNumber = mockIssues.length + 101;
  const issue: JiraIssue = {
    key: `${input.projectKey}-${nextNumber}`,
    fields: {
      summary: input.summary,
      description: input.description,
      status: { name: "To Do" },
      issuetype: { name: input.issueType ?? "Bug" },
      project: { key: input.projectKey },
      priority: { name: input.priority ?? "Medium" },
      labels: input.labels ?? [],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    },
    comments: []
  };
  mockIssues.push(issue);
  return issue;
}
