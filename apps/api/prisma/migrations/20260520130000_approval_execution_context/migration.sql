ALTER TABLE "approvals"
  ADD COLUMN "request_id" TEXT,
  ADD COLUMN "project_id" TEXT,
  ADD COLUMN "connector_id" TEXT,
  ADD COLUMN "tool_name" TEXT,
  ADD COLUMN "input" JSONB;

CREATE INDEX "approvals_request_id_idx" ON "approvals"("request_id");
CREATE INDEX "approvals_connector_id_tool_name_idx" ON "approvals"("connector_id", "tool_name");
