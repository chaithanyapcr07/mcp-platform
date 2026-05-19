import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { requireActor } from "../auth/auth.js";
import { forbidden } from "../errors.js";
import { getUserPermissions } from "./rbac.service.js";

export async function registerRbacRoutes(app: FastifyInstance) {
  app.get("/roles", { preHandler: requireActor }, async () => app.db.role.findMany({ include: { permissions: { include: { permission: true } } } }));
  app.post("/role-assignments", { preHandler: requireActor }, async (request: any) => {
    if (!request.actor.permissions.includes("registry:write")) throw forbidden("registry:write required");
    const body = request.body as { userId: string; roleId: string; teamId?: string; projectId?: string; resourceType?: string; resourceId?: string };
    return app.db.roleAssignment.create({ data: { id: nanoid(), ...body } });
  });
  app.get("/users/:id/permissions", { preHandler: requireActor }, async (request: any) => ({
    userId: request.params.id,
    permissions: await getUserPermissions(app.db, request.params.id)
  }));
}
