import { nanoid } from "nanoid";
import {
  connectorManifestSchema,
  skillManifestSchema,
  taskManifestSchema,
  type ConnectorManifest,
  type SkillManifest,
  type TaskManifest
} from "@mcp-platform/shared-types";
import type { DbClient } from "../db/client.js";
import { badRequest, notFound } from "../errors.js";
import { toConnectorManifest, toSkillManifest, toTaskManifest } from "./manifest-mappers.js";

export async function listConnectors(db: DbClient) {
  return db.connector.findMany({ include: { tools: true, resources: true, prompts: true }, orderBy: { name: "asc" } });
}

export async function getConnectorManifest(db: DbClient, id: string): Promise<ConnectorManifest> {
  const connector = await db.connector.findUnique({ where: { id }, include: { tools: true, resources: true, prompts: true } });
  if (!connector) throw notFound("Connector");
  return toConnectorManifest(connector as any);
}

export async function upsertConnector(db: DbClient, input: unknown) {
  const manifest = connectorManifestSchema.safeParse(input);
  if (!manifest.success) throw badRequest("Invalid connector manifest", manifest.error.flatten());
  const data = manifest.data;
  return db.$transaction(async (tx) => {
    await tx.connector.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        description: data.description,
        ownerTeam: data.ownerTeam,
        businessDomain: data.businessDomain,
        connectorType: data.connectorType,
        version: data.version,
        status: data.status,
        runtimeType: data.runtimeType,
        authType: data.authType,
        requiredScopes: data.requiredScopes,
        riskLevel: data.riskLevel,
        dataClassification: data.dataClassification,
        deploymentTarget: data.deploymentTarget,
        sourceRepository: data.sourceRepository,
        documentationUrl: data.documentationUrl
      },
      create: {
        id: data.id,
        name: data.name,
        description: data.description,
        ownerTeam: data.ownerTeam,
        businessDomain: data.businessDomain,
        connectorType: data.connectorType,
        version: data.version,
        status: data.status,
        runtimeType: data.runtimeType,
        authType: data.authType,
        requiredScopes: data.requiredScopes,
        riskLevel: data.riskLevel,
        dataClassification: data.dataClassification,
        deploymentTarget: data.deploymentTarget,
        sourceRepository: data.sourceRepository,
        documentationUrl: data.documentationUrl
      }
    });
    await tx.connectorTool.deleteMany({ where: { connectorId: data.id } });
    await tx.connectorResource.deleteMany({ where: { connectorId: data.id } });
    await tx.connectorPrompt.deleteMany({ where: { connectorId: data.id } });
    await tx.connectorTool.createMany({
      data: data.tools.map((tool) => ({
        id: nanoid(),
        connectorId: data.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as any,
        outputSchema: tool.outputSchema as any,
        permissions: tool.permissions,
        write: tool.write,
        riskLevel: tool.riskLevel
      }))
    });
    await tx.connectorResource.createMany({
      data: data.resources.map((resource) => ({
        id: nanoid(),
        connectorId: data.id,
        uri: resource.uri,
        description: resource.description,
        dataClassification: resource.dataClassification
      }))
    });
    await tx.connectorPrompt.createMany({
      data: data.prompts.map((prompt) => ({
        id: nanoid(),
        connectorId: data.id,
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments as any
      }))
    });
    return getConnectorManifest(tx as DbClient, data.id);
  });
}

export async function listSkills(db: DbClient) {
  return db.skill.findMany({ include: { connectors: true, tools: true, resources: true, prompts: true, evals: true }, orderBy: { name: "asc" } });
}

export async function getSkillManifest(db: DbClient, id: string): Promise<SkillManifest> {
  const skill = await db.skill.findUnique({
    where: { id },
    include: { connectors: true, tools: true, resources: true, prompts: true, evals: true }
  });
  if (!skill) throw notFound("Skill");
  return toSkillManifest(skill);
}

export async function upsertSkill(db: DbClient, input: unknown) {
  const manifest = skillManifestSchema.safeParse(input);
  if (!manifest.success) throw badRequest("Invalid skill manifest", manifest.error.flatten());
  const data = manifest.data;
  return db.$transaction(async (tx) => {
    await tx.skill.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        description: data.description,
        ownerTeam: data.ownerTeam,
        version: data.version,
        status: data.status,
        riskLevel: data.riskLevel,
        dataClassification: data.dataClassification,
        requiredPermissions: data.requiredPermissions,
        approvalRequirements: data.approvalRequirements,
        policyConstraints: data.policyConstraints,
        examples: data.examples
      },
      create: {
        id: data.id,
        name: data.name,
        description: data.description,
        ownerTeam: data.ownerTeam,
        version: data.version,
        status: data.status,
        riskLevel: data.riskLevel,
        dataClassification: data.dataClassification,
        requiredPermissions: data.requiredPermissions,
        approvalRequirements: data.approvalRequirements,
        policyConstraints: data.policyConstraints,
        examples: data.examples
      }
    });
    await tx.skillConnector.deleteMany({ where: { skillId: data.id } });
    await tx.skillTool.deleteMany({ where: { skillId: data.id } });
    await tx.skillResource.deleteMany({ where: { skillId: data.id } });
    await tx.skillPrompt.deleteMany({ where: { skillId: data.id } });
    await tx.skillConnector.createMany({ data: data.requiredConnectors.map((connectorId) => ({ id: nanoid(), skillId: data.id, connectorId })) });
    await tx.skillTool.createMany({ data: data.allowedTools.map((toolName) => ({ id: nanoid(), skillId: data.id, toolName })) });
    await tx.skillResource.createMany({ data: data.allowedResources.map((resourceUri) => ({ id: nanoid(), skillId: data.id, resourceUri })) });
    await tx.skillPrompt.createMany({ data: data.allowedPrompts.map((promptName) => ({ id: nanoid(), skillId: data.id, promptName })) });
    return getSkillManifest(tx as DbClient, data.id);
  });
}

export async function listTasks(db: DbClient) {
  return db.task.findMany({ include: { skills: true, evals: true }, orderBy: { name: "asc" } });
}

export async function getTaskManifest(db: DbClient, id: string): Promise<TaskManifest> {
  const task = await db.task.findUnique({ where: { id }, include: { skills: true, evals: true } });
  if (!task) throw notFound("Task");
  return toTaskManifest(task);
}

export async function upsertTask(db: DbClient, input: unknown) {
  const manifest = taskManifestSchema.safeParse(input);
  if (!manifest.success) throw badRequest("Invalid task manifest", manifest.error.flatten());
  const data = manifest.data;
  return db.$transaction(async (tx) => {
    await tx.task.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        description: data.description,
        ownerTeam: data.ownerTeam,
        version: data.version,
        status: data.status,
        inputSchema: data.inputSchema as any,
        outputSchema: data.outputSchema as any,
        executionConstraints: data.executionConstraints as any,
        approvalBehavior: data.approvalBehavior,
        policyConstraints: data.policyConstraints,
        auditRequirements: data.auditRequirements,
        testCases: data.testCases as any
      },
      create: {
        id: data.id,
        name: data.name,
        description: data.description,
        ownerTeam: data.ownerTeam,
        version: data.version,
        status: data.status,
        inputSchema: data.inputSchema as any,
        outputSchema: data.outputSchema as any,
        executionConstraints: data.executionConstraints as any,
        approvalBehavior: data.approvalBehavior,
        policyConstraints: data.policyConstraints,
        auditRequirements: data.auditRequirements,
        testCases: data.testCases as any
      }
    });
    await tx.taskSkill.deleteMany({ where: { taskId: data.id } });
    await tx.taskSkill.createMany({ data: data.requiredSkills.map((skillId) => ({ id: nanoid(), taskId: data.id, skillId })) });
    return getTaskManifest(tx as DbClient, data.id);
  });
}
