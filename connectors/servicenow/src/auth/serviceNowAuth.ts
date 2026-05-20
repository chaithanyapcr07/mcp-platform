export type ServiceNowAuthConfig = {
  mode: "mock" | "api_token";
  baseUrl?: string;
  apiToken?: string;
};

export function loadServiceNowAuthConfig(env = process.env): ServiceNowAuthConfig {
  return {
    mode: env.SERVICENOW_AUTH_MODE === "api_token" ? "api_token" : "mock",
    baseUrl: env.SERVICENOW_BASE_URL,
    apiToken: env.SERVICENOW_API_TOKEN
  };
}

export function assertServiceNowConfig(config: ServiceNowAuthConfig) {
  if (config.mode === "api_token" && (!config.baseUrl || !config.apiToken)) {
    throw new Error("SERVICENOW_BASE_URL and SERVICENOW_API_TOKEN are required in api_token mode");
  }
}

