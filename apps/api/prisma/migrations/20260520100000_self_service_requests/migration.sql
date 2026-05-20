CREATE TABLE "self_service_requests" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'portal',
  "status" TEXT NOT NULL,
  "requester_id" TEXT NOT NULL,
  "project_id" TEXT,
  "team" TEXT,
  "connector_id" TEXT,
  "desired_system" TEXT,
  "requested_tools" TEXT[],
  "read_or_write_intent" TEXT NOT NULL,
  "business_justification" TEXT NOT NULL,
  "data_classification" TEXT NOT NULL,
  "expected_volume" TEXT,
  "approval_required" BOOLEAN NOT NULL DEFAULT true,
  "approvers" TEXT[],
  "owner_team" TEXT,
  "runtime_owner" TEXT,
  "security_reviewer" TEXT,
  "deployment_mode" TEXT,
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "self_service_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "generated_artifacts" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "path" TEXT,
  "content" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "generated_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_steps" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "step_name" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "approver_role" TEXT NOT NULL,
  "approver_id" TEXT,
  "decision_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),

  CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_comments" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "request_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "self_service_requests_project_id_idx" ON "self_service_requests"("project_id");
CREATE INDEX "self_service_requests_connector_id_idx" ON "self_service_requests"("connector_id");
CREATE INDEX "self_service_requests_desired_system_idx" ON "self_service_requests"("desired_system");
CREATE INDEX "self_service_requests_status_idx" ON "self_service_requests"("status");
CREATE INDEX "generated_artifacts_request_id_idx" ON "generated_artifacts"("request_id");
CREATE INDEX "approval_steps_request_id_idx" ON "approval_steps"("request_id");
CREATE INDEX "request_comments_request_id_idx" ON "request_comments"("request_id");

ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "self_service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "self_service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "self_service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
