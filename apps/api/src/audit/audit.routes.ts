import type { FastifyInstance } from "fastify";
import { requireActor } from "../auth/auth.js";
import { forbidden } from "../errors.js";
import { listAuditEvents } from "./audit.service.js";

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get("/audit/events", { preHandler: requireActor }, async (request: any) => {
    if (!request.actor.permissions.includes("audit:read")) throw forbidden("audit:read required");
    return listAuditEvents(app.db, request.query as any);
  });
}
