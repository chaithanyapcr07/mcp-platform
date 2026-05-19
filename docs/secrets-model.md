# Secrets Model

Connectors must not store raw secrets in Git or database records.

The platform stores references:

- `secret_ref`
- `secret_provider`
- `secret_version`
- `allowed_runtime_identity`
- `rotation_status`

Local Jira mock mode uses no secret. Real Jira mode expects runtime environment variables:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`

Future providers can resolve the same references from Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, or Kubernetes Secrets.
