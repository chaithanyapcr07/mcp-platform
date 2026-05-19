import { trace, context, propagation, type Span, SpanStatusCode } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { sanitizeTelemetryAttributes } from "./sanitizer.js";

const tracingEnabled = process.env.TRACING_ENABLED !== "false";
const serviceName = process.env.OTEL_SERVICE_NAME ?? "mcp-platform-api";
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

let sdk: NodeSDK | undefined;

if (tracingEnabled) {
  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: "local-dev"
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${otelEndpoint.replace(/\/$/, "")}/v1/traces`
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false }
      })
    ]
  });
  sdk.start();
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
