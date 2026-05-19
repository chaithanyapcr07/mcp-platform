import { defineConnector } from "@mcp-platform/connector-sdk";
import { items, searchItems } from "./kb.js";

export const connector = defineConnector({
  id: "local-knowledge-base",
  name: "Local Knowledge Base",
  description: "Safe local MCP connector for searchable internal knowledge articles.",
  ownerTeam: "ai-platform",
  businessDomain: "engineering",
  connectorType: "knowledge_base",
  version: "1.0.0",
  status: "approved",
  runtimeType: "managed",
  authType: "none",
  requiredScopes: [],
  tools: [],
  resources: [{ uri: "kb://articles/{id}", description: "Knowledge base article by id", dataClassification: "internal" }],
  prompts: [{ name: "summarize_article_prompt", description: "Summarize an article for incident response", arguments: [{ name: "id", required: true }] }],
  riskLevel: "low",
  dataClassification: "internal",
  deploymentTarget: "local-docker",
  sourceRepository: "connectors/local-knowledge-base"
});

connector
  .tool({
    name: "search_items",
    description: "Search knowledge base items",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    outputSchema: { type: "object" },
    permissions: ["kb:read"],
    write: false,
    riskLevel: "low"
  }, async (input) => ({ items: searchItems(String(input.query ?? "")).slice(0, 10) }))
  .tool({
    name: "get_item",
    description: "Get a knowledge base item by id",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    outputSchema: { type: "object" },
    permissions: ["kb:read"],
    write: false,
    riskLevel: "low"
  }, async (input) => {
    const item = items.find((entry) => entry.id === input.id);
    if (!item) throw Object.assign(new Error("Knowledge item not found"), { statusCode: 404 });
    return { item };
  })
  .tool({
    name: "create_item",
    description: "Create a knowledge base item",
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    permissions: ["kb:write"],
    write: true,
    riskLevel: "medium"
  }, async (input) => {
    const item = {
      id: `kb-${String(items.length + 1).padStart(3, "0")}`,
      projectId: String(input.projectId ?? "platform-internal"),
      title: String(input.title ?? "Untitled"),
      body: String(input.body ?? ""),
      tags: Array.isArray(input.tags) ? input.tags.map(String) : []
    };
    items.push(item);
    return { item };
  })
  .tool({
    name: "list_projects",
    description: "List known project labels",
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    permissions: ["kb:read"],
    write: false,
    riskLevel: "low"
  }, async () => ({ projects: [...new Set(items.map((item) => item.projectId))] }));
