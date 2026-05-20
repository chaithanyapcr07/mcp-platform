export type ServiceNowAuthConfig = {
  mode: "mock" | "api_token";
  baseUrl?: string;
  apiToken?: string;
};

export function loadServiceNowAuthConfig(env = process.env): ServiceNowAuthConfig {
  const mode = env.SERVICENOW_AUTH_MODE === "api_token" ? "api_token" : "mock";

  return {
    mode,
    baseUrl: env.SERVICENOW_BASE_URL,
    apiToken: env.SERVICENOW_API_TOKEN
  };
}

export function assertServiceNowAuthReady(config: ServiceNowAuthConfig): void {
  if (config.mode === "mock") {
    return;
  }

  if (!config.baseUrl || !config.apiToken) {
    throw new Error("SERVICENOW_BASE_URL and SERVICENOW_API_TOKEN are required in api_token mode");
  }
}

