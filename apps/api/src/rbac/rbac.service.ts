import type { DbClient } from "../db/client.js";

export const rolePermissions: Record<string, string[]> = {
  platform_admin: [
    "registry:read",
    "registry:write",
    "connector:create",
    "connector:update",
    "connector:approve",
    "connector:disable",
    "connector:delete",
    "connector:execute",
    "connector:deploy",
    "connector:read_logs",
    "skill:create",
    "skill:update",
    "skill:approve",
    "skill:disable",
    "skill:execute",
    "task:create",
    "task:update",
    "task:approve",
    "task:disable",
    "task:execute",
    "tool:execute",
    "tool:read_schema",
    "policy:read",
    "policy:write",
    "audit:read",
    "kb:read",
    "kb:write"
  ],
  security_reviewer: ["registry:read", "connector:approve", "skill:approve", "task:approve", "policy:read", "audit:read"],
  connector_owner: ["registry:read", "connector:create", "connector:update", "connector:deploy", "connector:read_logs"],
  connector_developer: ["registry:read", "connector:create", "connector:update"],
  skill_owner: ["registry:read", "skill:create", "skill:update"],
  skill_developer: ["registry:read", "skill:create", "skill:update"],
  task_owner: ["registry:read", "task:create", "task:update"],
  task_developer: ["registry:read", "task:create", "task:update"],
  project_admin: ["registry:read", "connector:execute", "skill:execute", "task:execute", "tool:execute", "tool:read_schema", "kb:read", "kb:write"],
  project_developer: ["registry:read", "connector:execute", "skill:execute", "task:execute", "tool:execute", "tool:read_schema", "kb:read"],
  connector_consumer: ["registry:read", "connector:execute", "tool:execute", "tool:read_schema"],
  skill_consumer: ["registry:read", "skill:execute"],
  task_executor: ["registry:read", "task:execute"],
  auditor: ["registry:read", "audit:read"]
};

export async function getUserPermissions(db: DbClient, userId: string): Promise<string[]> {
  const assignments = await db.roleAssignment.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } }
  });
  return [
    ...new Set(assignments.flatMap((assignment) => assignment.role.permissions.map((entry) => entry.permission.name)))
  ];
}

export async function requirePermission(db: DbClient, userId: string, permission: string): Promise<void> {
  const permissions = await getUserPermissions(db, userId);
  if (!permissions.includes(permission)) {
    const { forbidden } = await import("../errors.js");
    throw forbidden(`Actor lacks ${permission}`);
  }
}
