import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { z } from "zod";
import type { AuthenticatedActor } from "@mcp-platform/shared-types";
import type { DbClient } from "../db/client.js";
import { ApiError } from "../errors.js";
import { authFailuresTotal } from "../observability/metrics.js";
import { sanitizeActorId } from "../observability/sanitizer.js";
import { withSpan } from "../observability/tracing.js";
import { getUserPermissions } from "../rbac/rbac.service.js";

declare module "fastify" {
  interface FastifyRequest {
    actor?: AuthenticatedActor;
  }
}

const tokenBodySchema = z.object({ email: z.string().email() });

export async function registerAuth(app: FastifyInstance, db: DbClient) {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "local-dev-secret-change-me"
  });

  app.post("/auth/dev-token", async (request) => {
    const body = tokenBodySchema.parse(request.body);
    const user = await db.user.findUnique({ where: { email: body.email } });
    if (!user) throw new ApiError(404, "Unknown development user", "unknown_user");
    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "8h" });
    return { token, user };
  });
}

export async function requireActor(request: FastifyRequest, _reply: FastifyReply) {
  return withSpan("auth.validate", {
    request_id: request.id,
    actor_type: "user"
  }, async (span) => {
    try {
      const decoded = await request.jwtVerify<{ sub: string; email: string }>();
      const db = request.server.db;
      const user = await db.user.findUnique({
        where: { id: decoded.sub },
        include: { memberships: { include: { project: true } }, roleAssignments: { include: { role: true } } }
      });
      if (!user || user.status !== "active") {
        authFailuresTotal.inc({ reason_code: "AUTH_FAILED" });
        throw new ApiError(401, "Inactive or unknown actor", "auth_failed");
      }
      const permissions = await getUserPermissions(db, user.id);
      span.setAttribute("actor_id", sanitizeActorId(user.id) ?? "unknown");
      request.actor = {
        id: user.id,
        email: user.email,
        name: user.name,
        teamIds: [...new Set(user.memberships.map((membership) => membership.project.teamId))],
        roles: user.roleAssignments.map((assignment) => assignment.role.name),
        permissions
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      authFailuresTotal.inc({ reason_code: "AUTH_REQUIRED" });
      throw new ApiError(401, "Authentication required", "auth_required");
    }
  });
}

declare module "fastify" {
  interface FastifyInstance {
    db: DbClient;
  }
}
