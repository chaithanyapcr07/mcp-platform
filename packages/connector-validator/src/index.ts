import fs from "node:fs";
import path from "node:path";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const requiredFiles = [
  "README.md",
  ".env.example",
  "Dockerfile",
  "connector.yaml",
  "src/server.ts",
  "src/tools",
  "src/resources",
  "src/prompts",
  "src/auth",
  "tests"
];

const sddFiles = [
  "requirements.md",
  "design.md",
  "tasks.md",
  "policy.yaml",
  "validation-report.md",
  "registration-request.yaml"
];

const ownershipFields = [
  "owner_team:",
  "runtime_owner:",
  "business_owner:",
  "security_reviewer:",
  "deployment_mode:",
  "data_classification:"
];

export function validateConnectorRepo(repoPath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const absolute = path.resolve(repoPath);
  const connectorYamlPath = path.join(absolute, "connector.yaml");
  const policyYamlPath = path.join(absolute, "policy.yaml");

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(absolute, file))) {
      errors.push(`Missing required connector file or directory: ${file}`);
    }
  }

  for (const file of sddFiles) {
    if (!fs.existsSync(path.join(absolute, file))) {
      warnings.push(`Missing SDD/review artifact: ${file}`);
    }
  }

  if (fs.existsSync(connectorYamlPath)) {
    const manifest = fs.readFileSync(connectorYamlPath, "utf8");
    for (const field of ownershipFields) {
      if (!manifest.includes(field)) errors.push(`connector.yaml missing ${field}`);
    }
    if (/type:\s*write/.test(manifest) && !/requires_human_approval:\s*true/.test(manifest)) {
      errors.push("connector.yaml has write tools without requires_human_approval: true");
    }
  }

  if (fs.existsSync(policyYamlPath)) {
    const policy = fs.readFileSync(policyYamlPath, "utf8");
    if (/create_|update_|delete_|transition_/.test(policy) && !/approval_required/.test(policy)) {
      errors.push("policy.yaml references write actions without approval_required");
    }
  }

  const envExample = path.join(absolute, ".env.example");
  if (fs.existsSync(envExample)) {
    const env = fs.readFileSync(envExample, "utf8");
    if (/TOKEN=.+\S/.test(env) || /SECRET=.+\S/.test(env) || /PASSWORD=.+\S/.test(env)) {
      errors.push(".env.example appears to contain a raw secret value");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

