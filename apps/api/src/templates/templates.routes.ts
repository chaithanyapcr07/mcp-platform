import type { FastifyInstance } from "fastify";
import { requireActor } from "../auth/auth.js";

const templates = [
  { id: "generic-rest-api-mcp-connector", type: "connector", description: "REST API MCP connector starter" },
  { id: "database-readonly-mcp-connector", type: "connector", description: "Read-only database connector starter" },
  { id: "internal-tool-mcp-connector", type: "connector", description: "Internal operations tool connector starter" },
  { id: "document-retrieval-mcp-connector", type: "connector", description: "Document retrieval connector starter" },
  { id: "custom-team-owned-mcp-connector", type: "connector", description: "Team-owned custom connector starter" },
  { id: "read-only-enterprise-skill", type: "skill", description: "Low-risk read-only skill starter" },
  { id: "write-action-skill-with-human-approval", type: "skill", description: "Write-action skill with review gates" },
  { id: "approval-required-task", type: "task", description: "Task starter with required approval" },
  { id: "read-only-summary-task", type: "task", description: "Read-only summary workflow starter" }
];

export async function registerTemplateRoutes(app: FastifyInstance) {
  app.get("/templates", { preHandler: requireActor }, async () => templates);
  app.get("/templates/:id", { preHandler: requireActor }, async (request: any) => templates.find((template) => template.id === request.params.id));
  app.post("/templates/:id/generate", { preHandler: requireActor }, async (request: any) => {
    const template = templates.find((entry) => entry.id === request.params.id);
    const body = (request.body ?? {}) as { name?: string; ownerTeam?: string };
    return {
      templateId: request.params.id,
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
}
