export function loadServiceNowAuth(env = process.env) {
  return {
    mode: env.SERVICENOW_AUTH_MODE ?? "mock",
    baseUrl: env.SERVICENOW_BASE_URL,
    tokenRef: env.SERVICENOW_API_TOKEN ? "local-env-placeholder" : undefined
  };
}
