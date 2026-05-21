import { devToken, printJson, request } from "./demo-utils.mjs";

const token = await devToken();
const { response, body } = await request("/agent/request", {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
  body: JSON.stringify({
    projectId: "ai-platform-demo",
    message: "Can you search Jira issues for project DEMO?",
    context: {
      jql: "project = DEMO ORDER BY created DESC",
      maxResults: 10
    }
  })
});

printJson(`Agent Jira search (${response.status})`, body);
