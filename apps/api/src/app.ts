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
import { getMetricsSnapshot, prometheusContentType, prometheusMetrics } from "./observability/metrics.js";
import { observabilityConfig } from "./observability/tracing.js";
import { getSiemExportStatus } from "./audit/siem-exporter.js";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

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
  app.get("/metrics", async (_request, reply) => {
    reply.header("content-type", prometheusContentType());
    return prometheusMetrics();
  });
  app.get("/observability/health", async () => {
    const config = observabilityConfig();
    return {
      ok: true,
      metrics: { enabled: config.metricsEnabled, endpoint: "/metrics" },
      tracing: { enabled: config.tracingEnabled, collectorEndpoint: config.otelCollectorEndpoint },
      auditExport: {
        enabled: config.auditExportEnabled,
        mode: config.exporterMode,
        status: getSiemExportStatus()
      },
      prometheus: { scrapeEndpoint: config.prometheusScrapeEndpoint }
    };
  });
  app.get("/observability/config", async () => observabilityConfig());

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      reply.status(error.statusCode).send({
        error: error.code,
        reason: error.message,
        requestId: _request.id,
        details: error.details
      });
      return;
    }
    if (typeof error === "object" && error !== null && ("issues" in error || (error as { name?: string }).name === "ZodError")) {
      reply.status(400).send({ error: { code: "validation_failed", message: "Request validation failed", details: error } });
      return;
    }
    reply.status(500).send({ error: { code: "internal_error", message: getErrorMessage(error) } });
  });

  return app;
}
