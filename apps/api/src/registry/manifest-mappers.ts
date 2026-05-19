import type {
  ConnectorManifest,
  PromptCapability,
  ResourceCapability,
  SkillManifest,
  TaskManifest,
  ToolCapability
} from "@mcp-platform/shared-types";

type ConnectorRecord = {
  id: string;
  name: string;
  description: string;
  ownerTeam: string;
  businessDomain: string;
  connectorType: string;
  version: string;
  status: string;
  runtimeType: string;
  authType: string;
  requiredScopes: string[];
  riskLevel: string;
  dataClassification: string;
  deploymentTarget: string | null;
  sourceRepository: string | null;
  documentationUrl: string | null;
  tools?: ToolCapability[];
  resources?: ResourceCapability[];
  prompts?: PromptCapability[];
};

export function toConnectorManifest(connector: ConnectorRecord): ConnectorManifest {
  return {
    id: connector.id,
    name: connector.name,
    description: connector.description,
    ownerTeam: connector.ownerTeam,
    businessDomain: connector.businessDomain,
    connectorType: connector.connectorType,
    version: connector.version,
    status: connector.status as ConnectorManifest["status"],
    runtimeType: connector.runtimeType as ConnectorManifest["runtimeType"],
    authType: connector.authType as ConnectorManifest["authType"],
    requiredScopes: connector.requiredScopes,
    tools: connector.tools ?? [],
    resources: connector.resources ?? [],
    prompts: connector.prompts ?? [],
    riskLevel: connector.riskLevel as ConnectorManifest["riskLevel"],
    dataClassification: connector.dataClassification as ConnectorManifest["dataClassification"],
    deploymentTarget: connector.deploymentTarget ?? undefined,
    sourceRepository: connector.sourceRepository ?? undefined,
    documentationUrl: connector.documentationUrl ?? undefined
  };
}

export function toSkillManifest(skill: any): SkillManifest {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    ownerTeam: skill.ownerTeam,
    version: skill.version,
    status: skill.status,
    riskLevel: skill.riskLevel,
    dataClassification: skill.dataClassification,
    requiredConnectors: skill.connectors?.map((entry: any) => entry.connectorId) ?? [],
    allowedTools: skill.tools?.map((entry: any) => entry.toolName) ?? [],
    allowedResources: skill.resources?.map((entry: any) => entry.resourceUri) ?? [],
    allowedPrompts: skill.prompts?.map((entry: any) => entry.promptName) ?? [],
    requiredPermissions: skill.requiredPermissions,
    approvalRequirements: skill.approvalRequirements,
    policyConstraints: skill.policyConstraints,
    evals: skill.evals?.map((entry: any) => entry.name) ?? [],
    examples: skill.examples
  };
}

export function toTaskManifest(task: any): TaskManifest {
  return {
    id: task.id,
    name: task.name,
    description: task.description,
    ownerTeam: task.ownerTeam,
    version: task.version,
    status: task.status,
    requiredSkills: task.skills?.map((entry: any) => entry.skillId) ?? [],
    inputSchema: task.inputSchema,
    outputSchema: task.outputSchema,
    executionConstraints: task.executionConstraints,
    approvalBehavior: task.approvalBehavior,
    policyConstraints: task.policyConstraints,
    auditRequirements: task.auditRequirements,
    testCases: Array.isArray(task.testCases) ? task.testCases : []
  };
}
