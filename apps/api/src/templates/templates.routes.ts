import type { FastifyInstance } from "fastify";
import { requireActor } from "../auth/auth.js";
import { templateGenerationsTotal } from "../observability/metrics.js";
import { withSpan } from "../observability/tracing.js";

const templates = [
  { id: "generic-rest-api", type: "connector", description: "REST API MCP connector starter" },
  { id: "jira-like-issue-tracker", type: "connector", description: "Jira-like issue tracker connector starter" },
  { id: "github-like-code-host", type: "connector", description: "GitHub-like code host connector starter" },
  { id: "database-readonly", type: "connector", description: "Read-only database connector starter" },
  { id: "document-retrieval", type: "connector", description: "Document retrieval connector starter" },
  { id: "internal-tool", type: "connector", description: "Internal operations tool connector starter" },
  { id: "custom-team-owned", type: "connector", description: "Team-owned custom connector starter" },
  { id: "read-only-enterprise-skill", type: "skill", description: "Low-risk read-only skill starter" },
  { id: "write-action-with-approval", type: "skill", description: "Write-action skill with review gates" },
  { id: "incident-response", type: "skill", description: "Incident response skill starter" },
  { id: "developer-productivity", type: "skill", description: "Developer productivity skill starter" },
  { id: "approval-required-task", type: "task", description: "Task starter with required approval" },
  { id: "read-only-summary-task", type: "task", description: "Read-only summary workflow starter" },
  { id: "incident-response-task", type: "task", description: "Incident response task starter" },
  { id: "software-delivery-task", type: "task", description: "Software delivery task starter" }
];

export async function registerTemplateRoutes(app: FastifyInstance) {
  app.get("/templates", { preHandler: requireActor }, async () => templates);
  app.get("/templates/:id", { preHandler: requireActor }, async (request: any) => templates.find((template) => template.id === request.params.id));
  app.post("/templates/:id/generate", { preHandler: requireActor }, async (request: any) => {
    return withSpan("template.generate_connector", {
      template_id: request.params.id,
      actor_id: request.actor?.id
    }, async () => {
      const template = templates.find((entry) => entry.id === request.params.id);
      const body = (request.body ?? {}) as { name?: string; ownerTeam?: string };
      templateGenerationsTotal.inc({ template_id: request.params.id, status: template ? "generated" : "unknown_template" });
      return {
        templateId: request.params.id,
        command: `npm run create:connector -- --name ${body.name ?? "team-connector"} --template ${request.params.id}`,
        files: {
          "README.md": `# ${body.name ?? template?.id}\n\nGenerated from ${request.params.id}.`,
          [`${template?.type ?? "artifact"}.yaml`]: {
            id: body.name ?? request.params.id,
            owner_team: body.ownerTeam ?? "platform-team",
            status: "draft"
          }
        }
      };
    });
  });
}
