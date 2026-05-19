import { z } from "zod";

export const lifecycleStatusSchema = z.enum([
  "draft",
  "pending_review",
  "approved",
  "deprecated",
  "disabled"
]);

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export const dataClassificationSchema = z.enum(["public", "internal", "confidential", "restricted"]);
export const runtimeTypeSchema = z.enum(["managed", "remote", "custom"]);
export const authTypeSchema = z.enum(["oauth2", "api_key", "api_token", "service_account", "workload_identity", "none"]);
export const decisionSchema = z.enum(["allowed", "denied", "requires_approval"]);

export const toolCapabilitySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.record(z.unknown()).default({}),
  outputSchema: z.record(z.unknown()).default({}),
  permissions: z.array(z.string()).default([]),
  write: z.boolean().default(false),
  riskLevel: riskLevelSchema.default("low")
});

export const resourceCapabilitySchema = z.object({
  uri: z.string().min(1),
  description: z.string().min(1),
  dataClassification: dataClassificationSchema.default("internal")
});

export const promptCapabilitySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  arguments: z.array(z.object({ name: z.string(), required: z.boolean().default(false) })).default([])
});

export const connectorManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  ownerTeam: z.string().min(1),
  businessDomain: z.string().min(1),
  connectorType: z.string().min(1),
  version: z.string().min(1),
  status: lifecycleStatusSchema,
  runtimeType: runtimeTypeSchema,
  authType: authTypeSchema,
  requiredScopes: z.array(z.string()).default([]),
  tools: z.array(toolCapabilitySchema).default([]),
  resources: z.array(resourceCapabilitySchema).default([]),
  prompts: z.array(promptCapabilitySchema).default([]),
  riskLevel: riskLevelSchema,
  dataClassification: dataClassificationSchema,
  deploymentTarget: z.string().optional(),
  sourceRepository: z.string().optional(),
  documentationUrl: z.string().optional()
});

export const skillManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  ownerTeam: z.string().min(1),
  version: z.string().min(1),
  status: lifecycleStatusSchema,
  riskLevel: riskLevelSchema,
  dataClassification: dataClassificationSchema,
  requiredConnectors: z.array(z.string()).default([]),
  allowedTools: z.array(z.string()).default([]),
  allowedResources: z.array(z.string()).default([]),
  allowedPrompts: z.array(z.string()).default([]),
  requiredPermissions: z.array(z.string()).default([]),
  approvalRequirements: z.array(z.string()).default([]),
  policyConstraints: z.array(z.string()).default([]),
  evals: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([])
});

export const taskManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  ownerTeam: z.string().min(1),
  version: z.string().min(1),
  status: lifecycleStatusSchema,
  requiredSkills: z.array(z.string()).default([]),
  inputSchema: z.record(z.unknown()).default({}),
  outputSchema: z.record(z.unknown()).default({}),
  executionConstraints: z.record(z.unknown()).default({}),
  approvalBehavior: z.enum(["none", "request", "required"]).default("none"),
  policyConstraints: z.array(z.string()).default([]),
  auditRequirements: z.array(z.string()).default([]),
  testCases: z.array(z.record(z.unknown())).default([])
});

export const auditEventSchema = z.object({
  actorId: z.string(),
  actorType: z.string().default("user"),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().optional(),
  connectorId: z.string().optional(),
  skillId: z.string().optional(),
  taskId: z.string().optional(),
  toolName: z.string().optional(),
  decision: decisionSchema,
  reason: z.string(),
  reasonCode: z.string().optional(),
  requestId: z.string(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  riskLevel: riskLevelSchema.optional(),
  dataClassification: dataClassificationSchema.optional(),
  metadata: z.record(z.unknown()).default({})
});

export type LifecycleStatus = z.infer<typeof lifecycleStatusSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type DataClassification = z.infer<typeof dataClassificationSchema>;
export type ConnectorManifest = z.infer<typeof connectorManifestSchema>;
export type SkillManifest = z.infer<typeof skillManifestSchema>;
export type TaskManifest = z.infer<typeof taskManifestSchema>;
export type ToolCapability = z.infer<typeof toolCapabilitySchema>;
export type ResourceCapability = z.infer<typeof resourceCapabilitySchema>;
export type PromptCapability = z.infer<typeof promptCapabilitySchema>;
export type AuditEventInput = z.infer<typeof auditEventSchema>;

export type AuthenticatedActor = {
  id: string;
  email: string;
  name: string;
  teamIds: string[];
  roles: string[];
  permissions: string[];
};

export type PolicyInput = {
  actor: AuthenticatedActor;
  projectId?: string;
  connector?: ConnectorManifest;
  skill?: SkillManifest;
  task?: TaskManifest;
  tool?: ToolCapability;
  hasProjectConnectorAccess?: boolean;
  hasProjectSkillAccess?: boolean;
  hasProjectTaskAccess?: boolean;
  hasExplicitRestrictedApproval?: boolean;
  hasWriteAccess?: boolean;
  requestId: string;
};

export type PolicyDecision = {
  decision: "allowed" | "denied" | "requires_approval";
  reason: string;
  requiredApproval?: string;
};

export type ToolInvocationRequest = {
  projectId: string;
  input: Record<string, unknown>;
  skillId?: string;
  taskId?: string;
};

export type ToolInvocationResponse = {
  requestId: string;
  connectorId: string;
  toolName: string;
  output: unknown;
};
