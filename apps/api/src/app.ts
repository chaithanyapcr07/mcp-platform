import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import type { DbClient } from "./db/client.js";
import { prisma } from "./db/client.js";
import { registerAuth } from "./auth/auth.js";
import { ApiError } from "./errors.js";
import { registerRegistryRoutes } from "./registry/registry.routes.js";
import { registerProjectRoutes } from "./projects/projects.routes.js";
import { registerRbacRoutes } from "./rbac/rbac.routes.js";
import { registerAuditRoutes } from "./audit/audit.routes.js";
import { registerTemplateRoutes } from "./templates/templates.routes.js";
import { registerGatewayRoutes } from "./gateway/gateway.routes.js";
import { getMetricsSnapshot } from "./observability/metrics.js";

export async function buildApp(db: DbClient = prisma) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    },
    genReqId: (request) => (request.headers["x-correlation-id"] as string | undefined) ?? randomUUID()
  });
  app.decorate("db", db);
  await app.register(cors, { origin: true });
  await registerAuth(app, db);
  await registerRegistryRoutes(app);
  await registerProjectRoutes(app);
  await registerRbacRoutes(app);
  await registerAuditRoutes(app);
  await registerTemplateRoutes(app);
  await registerGatewayRoutes(app);

  app.get("/health", async () => ({ ok: true, service: "mcp-platform-api" }));
  app.get("/observability/metrics", async () => getMetricsSnapshot());

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
      return;
    }
    if ("issues" in error || error.name === "ZodError") {
      reply.status(400).send({ error: { code: "validation_failed", message: "Request validation failed", details: error } });
      return;
    }
    reply.status(500).send({ error: { code: "internal_error", message: error.message } });
  });

  return app;
}
