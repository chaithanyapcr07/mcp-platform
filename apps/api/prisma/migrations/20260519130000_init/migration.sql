CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teams" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "team_id" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'dev',
  "write_access" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_memberships" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  CONSTRAINT "project_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permissions" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
  "id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_assignments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "team_id" TEXT,
  "project_id" TEXT,
  "resource_type" TEXT,
  "resource_id" TEXT,
  CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connectors" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "owner_team" TEXT NOT NULL,
  "business_domain" TEXT NOT NULL,
  "connector_type" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "runtime_type" TEXT NOT NULL,
  "auth_type" TEXT NOT NULL,
  "required_scopes" TEXT[] NOT NULL,
  "risk_level" TEXT NOT NULL,
  "data_classification" TEXT NOT NULL,
  "deployment_target" TEXT,
  "source_repository" TEXT,
  "documentation_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connector_tools" (
  "id" TEXT NOT NULL,
  "connector_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "input_schema" JSONB NOT NULL,
  "output_schema" JSONB NOT NULL,
  "permissions" TEXT[] NOT NULL,
  "write" BOOLEAN NOT NULL DEFAULT false,
  "risk_level" TEXT NOT NULL,
  CONSTRAINT "connector_tools_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connector_resources" (
  "id" TEXT NOT NULL,
  "connector_id" TEXT NOT NULL,
  "uri" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "data_classification" TEXT NOT NULL,
  CONSTRAINT "connector_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connector_prompts" (
  "id" TEXT NOT NULL,
  "connector_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "arguments" JSONB NOT NULL,
  CONSTRAINT "connector_prompts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connector_secrets" (
  "id" TEXT NOT NULL,
  "connector_id" TEXT NOT NULL,
  "secret_ref" TEXT NOT NULL,
  "secret_provider" TEXT NOT NULL,
  "secret_version" TEXT NOT NULL,
  "allowed_runtime_identity" TEXT NOT NULL,
  "rotation_status" TEXT NOT NULL,
  "last_rotated_at" TIMESTAMP(3),
  CONSTRAINT "connector_secrets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connector_access_requests" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "connector_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "approved_by" TEXT,
  "access_level" TEXT NOT NULL DEFAULT 'read',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "connector_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skills" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "owner_team" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "risk_level" TEXT NOT NULL,
  "data_classification" TEXT NOT NULL,
  "required_permissions" TEXT[] NOT NULL,
  "approval_requirements" TEXT[] NOT NULL,
  "policy_constraints" TEXT[] NOT NULL,
  "examples" TEXT[] NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_connectors" (
  "id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "connector_id" TEXT NOT NULL,
  CONSTRAINT "skill_connectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_tools" (
  "id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "tool_name" TEXT NOT NULL,
  CONSTRAINT "skill_tools_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_resources" (
  "id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "resource_uri" TEXT NOT NULL,
  CONSTRAINT "skill_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_prompts" (
  "id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "prompt_name" TEXT NOT NULL,
  CONSTRAINT "skill_prompts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_evals" (
  "id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "criteria" JSONB NOT NULL,
  CONSTRAINT "skill_evals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_access_requests" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "approved_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skill_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tasks" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "owner_team" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "input_schema" JSONB NOT NULL,
  "output_schema" JSONB NOT NULL,
  "execution_constraints" JSONB NOT NULL,
  "approval_behavior" TEXT NOT NULL,
  "policy_constraints" TEXT[] NOT NULL,
  "audit_requirements" TEXT[] NOT NULL,
  "test_cases" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_skills" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  CONSTRAINT "task_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_evals" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "criteria" JSONB NOT NULL,
  CONSTRAINT "task_evals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_access_requests" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "approved_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_executions" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "output" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  CONSTRAINT "task_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_execution_steps" (
  "id" TEXT NOT NULL,
  "execution_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "connector_id" TEXT,
  "tool_name" TEXT,
  "status" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "output" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  CONSTRAINT "task_execution_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approvals" (
  "id" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "reviewed_by" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "policies" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "definition" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actor_id" TEXT NOT NULL,
  "actor_type" TEXT NOT NULL,
  "team_id" TEXT,
  "project_id" TEXT,
  "action" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT,
  "connector_id" TEXT,
  "skill_id" TEXT,
  "task_id" TEXT,
  "tool_name" TEXT,
  "decision" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "reason_code" TEXT,
  "request_id" TEXT NOT NULL,
  "trace_id" TEXT,
  "span_id" TEXT,
  "risk_level" TEXT,
  "data_classification" TEXT,
  "metadata" JSONB NOT NULL,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rate_limits" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "scope_id" TEXT NOT NULL,
  "limit_per_min" INTEGER NOT NULL,
  "current_count" INTEGER NOT NULL DEFAULT 0,
  "reset_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "project_memberships_user_id_project_id_key" ON "project_memberships"("user_id", "project_id");
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");
CREATE UNIQUE INDEX "connector_tools_connector_id_name_key" ON "connector_tools"("connector_id", "name");
CREATE UNIQUE INDEX "connector_access_requests_project_id_connector_id_key" ON "connector_access_requests"("project_id", "connector_id");
CREATE UNIQUE INDEX "skill_connectors_skill_id_connector_id_key" ON "skill_connectors"("skill_id", "connector_id");
CREATE UNIQUE INDEX "skill_access_requests_project_id_skill_id_key" ON "skill_access_requests"("project_id", "skill_id");
CREATE UNIQUE INDEX "task_skills_task_id_skill_id_key" ON "task_skills"("task_id", "skill_id");
CREATE UNIQUE INDEX "task_access_requests_project_id_task_id_key" ON "task_access_requests"("project_id", "task_id");
CREATE INDEX "audit_events_request_id_idx" ON "audit_events"("request_id");
CREATE INDEX "audit_events_project_id_idx" ON "audit_events"("project_id");
CREATE UNIQUE INDEX "rate_limits_scope_scope_id_key" ON "rate_limits"("scope", "scope_id");

ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "connector_tools" ADD CONSTRAINT "connector_tools_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "connector_resources" ADD CONSTRAINT "connector_resources_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "connector_prompts" ADD CONSTRAINT "connector_prompts_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "connector_secrets" ADD CONSTRAINT "connector_secrets_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "connector_access_requests" ADD CONSTRAINT "connector_access_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "connector_access_requests" ADD CONSTRAINT "connector_access_requests_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_connectors" ADD CONSTRAINT "skill_connectors_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_tools" ADD CONSTRAINT "skill_tools_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_resources" ADD CONSTRAINT "skill_resources_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_prompts" ADD CONSTRAINT "skill_prompts_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_evals" ADD CONSTRAINT "skill_evals_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_access_requests" ADD CONSTRAINT "skill_access_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_access_requests" ADD CONSTRAINT "skill_access_requests_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_skills" ADD CONSTRAINT "task_skills_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_skills" ADD CONSTRAINT "task_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_evals" ADD CONSTRAINT "task_evals_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_access_requests" ADD CONSTRAINT "task_access_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_access_requests" ADD CONSTRAINT "task_access_requests_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_execution_steps" ADD CONSTRAINT "task_execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "task_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
