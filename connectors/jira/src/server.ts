import "./telemetry.js";
import Fastify from "fastify";
import { JiraClient } from "./client.js";
import { loadJiraAuthConfig } from "./auth/jiraAuth.js";
import { searchIssues } from "./tools/searchIssues.js";
import { getIssue } from "./tools/getIssue.js";
import { createIssue } from "./tools/createIssue.js";
import { addComment } from "./tools/addComment.js";
import { transitionIssue } from "./tools/transitionIssue.js";
import { issueResource, readIssueResource } from "./resources/issueResource.js";
import { bugTriagePrompt } from "./prompts/bugTriagePrompt.js";
import { withConnectorSpan } from "./telemetry.js";

const config = loadJiraAuthConfig();
const client = new JiraClient(config);
const app = Fastify({ logger: true });

const manifest = {
  id: "jira",
  name: "Jira MCP Connector",
  description: "Provides governed access to Jira issue search, read, create, comment, and transition operations.",
  authMode: config.mode,
  tools: [
    "jira.search_issues",
    "jira.get_issue",
    "jira.create_issue",
    "jira.add_comment",
    "jira.transition_issue"
  ],
  resources: [issueResource],
  prompts: [bugTriagePrompt]
};

const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  "jira.search_issues": (input) => searchIssues(client, input),
  "jira.get_issue": (input) => getIssue(client, input),
  "jira.create_issue": (input) => createIssue(client, input),
  "jira.add_comment": (input) => addComment(client, input),
  "jira.transition_issue": (input) => transitionIssue(client, input)
};

app.get("/health", async () => ({ ok: true, connectorId: "jira", authMode: config.mode }));
app.get("/manifest", async () => manifest);
app.get("/resources/issue/:issueKey", async (request: any) => readIssueResource(client, `jira://issues/${request.params.issueKey}`));
app.get("/prompts/jira_bug_triage_prompt", async () => bugTriagePrompt);

app.post("/tools/:toolName/invoke", async (request: any, reply) => {
  const toolName = decodeURIComponent(request.params.toolName);
  const handler = handlers[toolName];
  if (!handler) {
    reply.status(404).send({ error: "TOOL_NOT_FOUND", message: `Unknown Jira tool ${toolName}` });
    return;
  }
  try {
    return await withConnectorSpan("connector.invoke", request.headers, {
      request_id: request.headers["x-request-id"],
      connector_id: "jira",
      tool_name: toolName,
      connector_runtime: config.mode
    }, async () => withConnectorSpan(`connector.${toolName}`, request.headers, {
      request_id: request.headers["x-request-id"],
      connector_id: "jira",
      tool_name: toolName,
      connector_runtime: config.mode
    }, async () => handler(request.body ?? {})));
  } catch (error: any) {
    reply.status(error.statusCode ?? 400).send({
      error: "JIRA_CONNECTOR_ERROR",
      message: error.message,
      details: error.payload
    });
  }
});

const port = Number(process.env.JIRA_CONNECTOR_PORT ?? 4200);
await app.listen({ host: "0.0.0.0", port });
