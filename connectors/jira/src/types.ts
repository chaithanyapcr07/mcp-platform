export type JiraIssue = {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: { name: string };
    issuetype: { name: string };
    project: { key: string };
    priority?: { name: string };
    labels?: string[];
    created?: string;
    updated?: string;
  };
  comments: { body: string; created: string }[];
};

export type SearchIssuesInput = {
  jql: string;
  maxResults?: number;
};

export type GetIssueInput = {
  issueKey: string;
};

export type CreateIssueInput = {
  projectKey: string;
  summary: string;
  description?: string;
  issueType?: string;
  priority?: string;
  labels?: string[];
};

export type AddCommentInput = {
  issueKey: string;
  comment: string;
};

export type TransitionIssueInput = {
  issueKey: string;
  transitionName: string;
};
