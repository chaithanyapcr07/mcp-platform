import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { rolePermissions } from "../src/rbac/rbac.service.js";
import { upsertConnector, upsertSkill, upsertTask } from "../src/registry/registry.service.js";

const prisma = new PrismaClient();

const enterpriseConnectors = [
  "github-enterprise",
  "gitlab",
  "jira",
  "confluence",
  "slack",
  "microsoft-teams",
  "google-drive",
  "sharepoint",
  "servicenow",
  "datadog",
  "pagerduty",
  "jenkins",
  "argocd",
  "kubernetes",
  "snowflake",
  "bigquery",
  "postgres",
  "s3",
  "gcs",
  "azure-blob-storage",
  "hashicorp-vault",
  "looker",
  "tableau",
  "salesforce"
];

async function main() {
  const permissionNames = [...new Set(Object.values(rolePermissions).flat())];
  for (const name of permissionNames) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { id: name, name, description: `${name} permission` }
    });
  }
  for (const [roleName, permissions] of Object.entries(rolePermissions)) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { id: roleName, name: roleName, description: `${roleName} role` }
    });
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleName, permissionId: permission } },
        update: {},
        create: { id: nanoid(), roleId: roleName, permissionId: permission }
      });
    }
  }

  await prisma.team.upsert({
    where: { id: "ai-platform" },
    update: {},
    create: { id: "ai-platform", name: "AI Platform", description: "Internal AI platform team" }
  });
  await prisma.project.upsert({
    where: { id: "platform-internal" },
    update: { writeAccess: false },
    create: { id: "platform-internal", name: "Platform Internal", teamId: "ai-platform", environment: "dev", writeAccess: false }
  });

  const users = [
    { id: "u-admin", email: "admin@example.com", name: "Platform Admin", role: "platform_admin" },
    { id: "u-security", email: "security@example.com", name: "Security Reviewer", role: "security_reviewer" },
    { id: "u-dev", email: "developer@example.com", name: "Project Developer", role: "project_developer" },
    { id: "u-auditor", email: "auditor@example.com", name: "Audit Reader", role: "auditor" }
  ];
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: { id: user.id, email: user.email, name: user.name }
    });
    await prisma.roleAssignment.upsert({
      where: { id: `${user.id}-${user.role}` },
      update: {},
      create: { id: `${user.id}-${user.role}`, userId: user.id, roleId: user.role, projectId: "platform-internal" }
    });
    await prisma.projectMembership.upsert({
      where: { userId_projectId: { userId: user.id, projectId: "platform-internal" } },
      update: {},
      create: { id: nanoid(), userId: user.id, projectId: "platform-internal", role: user.role }
    });
  }

  for (const connectorId of enterpriseConnectors) {
    await upsertConnector(prisma, {
      id: connectorId,
      name: connectorId.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
      description: `Seed metadata for ${connectorId}. External integration is intentionally stubbed in the MVP.`,
      ownerTeam: "ai-platform",
      businessDomain: "enterprise",
      connectorType: "mcp_server",
      version: "0.1.0",
      status: "draft",
      runtimeType: "remote",
      authType: "oauth2",
      requiredScopes: ["read"],
      tools: [
        {
          name: "search",
          description: `Search ${connectorId}`,
          inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
          outputSchema: { type: "object" },
          permissions: ["tool:execute"],
          write: false,
          riskLevel: "low"
        }
      ],
      resources: [],
      prompts: [],
      riskLevel: ["snowflake", "bigquery", "postgres", "s3", "gcs", "azure-blob-storage"].includes(connectorId) ? "high" : "medium",
      dataClassification: ["snowflake", "bigquery", "postgres", "s3", "gcs", "azure-blob-storage"].includes(connectorId) ? "restricted" : "confidential",
      deploymentTarget: "external",
      documentationUrl: `https://internal.example.com/mcp/${connectorId}`
    });
  }

  await upsertConnector(prisma, {
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
    tools: [
      {
        name: "search_items",
        description: "Search knowledge base items",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
        outputSchema: { type: "object", properties: { items: { type: "array" } } },
        permissions: ["kb:read"],
        write: false,
        riskLevel: "low"
      },
      {
        name: "get_item",
        description: "Get a knowledge base item by id",
        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        outputSchema: { type: "object" },
        permissions: ["kb:read"],
        write: false,
        riskLevel: "low"
      },
      {
        name: "create_item",
        description: "Create a local knowledge base item",
        inputSchema: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, projectId: { type: "string" } }, required: ["title", "body"] },
        outputSchema: { type: "object" },
        permissions: ["kb:write"],
        write: true,
        riskLevel: "medium"
      },
      {
        name: "list_projects",
        description: "List known knowledge base project labels",
        inputSchema: { type: "object" },
        outputSchema: { type: "object" },
        permissions: ["kb:read"],
        write: false,
        riskLevel: "low"
      }
    ],
    resources: [{ uri: "kb://articles/{id}", description: "Knowledge base article by id", dataClassification: "internal" }],
    prompts: [{ name: "summarize_article_prompt", description: "Summarize an article for incident response", arguments: [{ name: "id", required: true }] }],
    riskLevel: "low",
    dataClassification: "internal",
    deploymentTarget: "local-docker",
    sourceRepository: "connectors/local-knowledge-base",
    documentationUrl: "/docs/custom-connector-guide.md"
  });

  await prisma.connectorSecret.upsert({
    where: { id: "local-kb-secret-ref" },
    update: {},
    create: {
      id: "local-kb-secret-ref",
      connectorId: "local-knowledge-base",
      secretRef: "local/kb/api-key",
      secretProvider: "local_mock",
      secretVersion: "v1",
      allowedRuntimeIdentity: "mcp-gateway-local",
      rotationStatus: "current"
    }
  });

  await upsertSkill(prisma, {
    id: "knowledge-base-search",
    name: "Knowledge Base Search",
    description: "Governed read-only search over internal knowledge base articles.",
    ownerTeam: "ai-platform",
    version: "1.0.0",
    status: "approved",
    riskLevel: "low",
    dataClassification: "internal",
    requiredConnectors: ["local-knowledge-base"],
    allowedTools: ["local-knowledge-base.search_items", "local-knowledge-base.get_item", "search_items", "get_item"],
    allowedResources: ["kb://articles/{id}"],
    allowedPrompts: ["summarize_article_prompt"],
    requiredPermissions: ["kb:read"],
    approvalRequirements: [],
    policyConstraints: ["read_only", "audit_required"],
    evals: ["kb-search-relevance"],
    examples: ["Find a runbook for database failover"]
  });

  for (const skill of [
    "engineering-ticket-management",
    "incident-response-assistant",
    "code-review-assistant",
    "cloud-operations-assistant"
  ]) {
    await upsertSkill(prisma, {
      id: skill,
      name: skill.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
      description: `Seed skill definition for ${skill}.`,
      ownerTeam: "ai-platform",
      version: "0.1.0",
      status: "draft",
      riskLevel: "medium",
      dataClassification: "confidential",
      requiredConnectors: [],
      allowedTools: [],
      allowedResources: [],
      allowedPrompts: [],
      requiredPermissions: [],
      approvalRequirements: ["security_review"],
      policyConstraints: [],
      evals: [],
      examples: []
    });
  }

  await upsertTask(prisma, {
    id: "search-runbook-and-draft-response",
    name: "Search Runbook And Draft Response",
    description: "Search the knowledge base and draft an incident response summary.",
    ownerTeam: "ai-platform",
    version: "1.0.0",
    status: "approved",
    requiredSkills: ["knowledge-base-search"],
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    outputSchema: { type: "object" },
    executionConstraints: { maxSteps: 3, timeoutSeconds: 30 },
    approvalBehavior: "none",
    policyConstraints: ["read_only"],
    auditRequirements: ["tool_invocations", "task_steps"],
    testCases: [{ input: { query: "database failover" }, expect: "runbook" }]
  });

  for (const task of [
    "create-jira-ticket-from-incident",
    "summarize-pr-risk",
    "summarize-open-incidents",
    "prepare-deployment-risk-summary"
  ]) {
    await upsertTask(prisma, {
      id: task,
      name: task.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
      description: `Seed task definition for ${task}.`,
      ownerTeam: "ai-platform",
      version: "0.1.0",
      status: "draft",
      requiredSkills: [],
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      executionConstraints: { timeoutSeconds: 60 },
      approvalBehavior: "request",
      policyConstraints: [],
      auditRequirements: ["task_execution"],
      testCases: []
    });
  }

  await prisma.connectorAccessRequest.upsert({
    where: { projectId_connectorId: { projectId: "platform-internal", connectorId: "local-knowledge-base" } },
    update: { status: "approved", accessLevel: "read" },
    create: { id: nanoid(), projectId: "platform-internal", connectorId: "local-knowledge-base", status: "approved", requestedBy: "u-admin", approvedBy: "u-admin", accessLevel: "read" }
  });
  await prisma.skillAccessRequest.upsert({
    where: { projectId_skillId: { projectId: "platform-internal", skillId: "knowledge-base-search" } },
    update: { status: "approved" },
    create: { id: nanoid(), projectId: "platform-internal", skillId: "knowledge-base-search", status: "approved", requestedBy: "u-admin", approvedBy: "u-admin" }
  });
  await prisma.taskAccessRequest.upsert({
    where: { projectId_taskId: { projectId: "platform-internal", taskId: "search-runbook-and-draft-response" } },
    update: { status: "approved" },
    create: { id: nanoid(), projectId: "platform-internal", taskId: "search-runbook-and-draft-response", status: "approved", requestedBy: "u-admin", approvedBy: "u-admin" }
  });

  await prisma.policy.upsert({
    where: { id: "default-runtime-policy" },
    update: {},
    create: {
      id: "default-runtime-policy",
      name: "Default Runtime Policy",
      description: "Internal evaluator rules for connector, skill, task, and tool execution.",
      scope: "runtime",
      definition: {
        denyDisabled: true,
        denyWithoutAccess: true,
        requireHumanApprovalForHighRiskWrite: true,
        requireRestrictedApproval: true
      }
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
