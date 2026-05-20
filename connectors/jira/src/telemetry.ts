import { context, propagation, SpanStatusCode, trace, type Span } from "@opentelemetry/api";

const tracingEnabled = process.env.TRACING_ENABLED !== "false";
const serviceName = process.env.OTEL_SERVICE_NAME ?? "mcp-jira-connector";
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

const allowedAttributes = new Set([
  "request_id",
  "connector_id",
  "tool_name",
  "connector_runtime",
  "status"
]);

function sanitizeAttributes(input: Record<string, unknown> = {}) {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowedAttributes.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string") safe[key] = value.slice(0, 160);
    else if (typeof value === "number" || typeof value === "boolean") safe[key] = value;
  }
  return safe;
}

let sdk: { start: () => void; shutdown: () => Promise<void> } | undefined;

if (tracingEnabled) {
  const [{ getNodeAutoInstrumentations }, { OTLPTraceExporter }, resources, { NodeSDK }] = await Promise.all([
    import("@opentelemetry/auto-instrumentations-node"),
    import("@opentelemetry/exporter-trace-otlp-http"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/sdk-node")
  ]);
  const resourceAttributes = {
    "service.name": serviceName,
    "service.version": "local-dev"
  };
  const resource = "resourceFromAttributes" in resources
    ? (resources as any).resourceFromAttributes(resourceAttributes)
    : new (resources as any).Resource(resourceAttributes);
  const startedSdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: `${otelEndpoint.replace(/\/$/, "")}/v1/traces`
    }) as any,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false }
      }) as any
    ]
  }) as any;
  sdk = startedSdk;
  startedSdk.start();
}

export const tracer = trace.getTracer(serviceName);

export async function withConnectorSpan<T>(
  name: string,
  headers: Record<string, string | string[] | undefined>,
  attributes: Record<string, unknown>,
  fn: (span: Span) => Promise<T>
) {
  const carrier: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") carrier[key] = value;
  }
  const parentContext = propagation.extract(context.active(), carrier);
  return context.with(parentContext, () =>
    tracer.startActiveSpan(name, { attributes: sanitizeAttributes(attributes) }, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        throw error;
      } finally {
        span.end();
      }
    })
  );
}

process.on("SIGTERM", () => {
  sdk?.shutdown().catch(() => undefined);
});
