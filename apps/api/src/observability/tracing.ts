import { trace, context, propagation, type Span, SpanStatusCode } from "@opentelemetry/api";
import { sanitizeTelemetryAttributes } from "./sanitizer.js";

const tracingEnabled = process.env.TRACING_ENABLED !== "false";
const serviceName = process.env.OTEL_SERVICE_NAME ?? "mcp-platform-api";
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

let sdk: { start: () => void; shutdown: () => Promise<void> } | undefined;

if (tracingEnabled) {
  const [{ NodeSDK }, { OTLPTraceExporter }, resources, { getNodeAutoInstrumentations }] = await Promise.all([
    import("@opentelemetry/sdk-node"),
    import("@opentelemetry/exporter-trace-otlp-http"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/auto-instrumentations-node")
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

export function activeTraceContext() {
  const span = trace.getActiveSpan();
  const spanContext = span?.spanContext();
  return {
    traceId: spanContext?.traceId,
    spanId: spanContext?.spanId
  };
}

export async function withSpan<T>(name: string, attributes: Record<string, unknown>, fn: (span: Span) => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, { attributes: sanitizeTelemetryAttributes(attributes) }, async (span) => {
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
  });
}

export function injectTraceHeaders(headers: Record<string, string> = {}) {
  propagation.inject(context.active(), headers);
  return headers;
}

export function observabilityConfig() {
  return {
    metricsEnabled: process.env.METRICS_ENABLED !== "false",
    tracingEnabled,
    auditExportEnabled: process.env.SIEM_EXPORT_MODE !== "disabled",
    exporterMode: process.env.SIEM_EXPORT_MODE ?? "local_jsonl",
    otelCollectorEndpoint: otelEndpoint,
    prometheusScrapeEndpoint: "http://api:4000/metrics",
    serviceName
  };
}

process.on("SIGTERM", () => {
  sdk?.shutdown().catch(() => undefined);
});
