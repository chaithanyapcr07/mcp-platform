export const bugTriagePrompt = {
  name: "jira_bug_triage_prompt",
  description: "Prompt template for triaging a bug and preparing Jira issue fields.",
  template: `You are helping triage an engineering incident into a Jira bug.

Return:
- projectKey
- summary
- description
- priority
- labels

Use concise incident language and include reproduction details, impact, suspected owner, and rollback notes when available.`
};
