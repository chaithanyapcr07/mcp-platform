ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "reason_code" TEXT;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "trace_id" TEXT;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "span_id" TEXT;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "risk_level" TEXT;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "data_classification" TEXT;
CREATE INDEX IF NOT EXISTS "audit_events_trace_id_idx" ON "audit_events"("trace_id");
