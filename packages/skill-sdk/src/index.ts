import { skillManifestSchema, type SkillManifest } from "@mcp-platform/shared-types";

export type SkillPlanStep = {
  connectorId: string;
  toolName: string;
  inputPath?: string;
};

export type SkillDefinition = {
  manifest: SkillManifest;
  plan: SkillPlanStep[];
};

export function defineSkill(definition: SkillDefinition): SkillDefinition {
  skillManifestSchema.parse(definition.manifest);
  return definition;
}

export function assertToolAllowed(skill: SkillManifest, connectorId: string, toolName: string): void {
  if (!skill.allowedTools.includes(toolName) && !skill.allowedTools.includes(`${connectorId}.${toolName}`)) {
    throw new Error(`Tool ${connectorId}.${toolName} is not allowed by skill ${skill.id}`);
  }
}
