export type JiraAuthConfig = {
  mode: "mock" | "api_token";
  baseUrl?: string;
  email?: string;
  apiToken?: string;
};

export function loadJiraAuthConfig(env = process.env): JiraAuthConfig {
  const mode = (env.JIRA_AUTH_MODE ?? "mock") as JiraAuthConfig["mode"];
  if (mode === "mock") return { mode };
  const baseUrl = env.JIRA_BASE_URL;
  const email = env.JIRA_EMAIL;
  const apiToken = env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !apiToken) {
    throw new Error("JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN are required when JIRA_AUTH_MODE=api_token");
  }
  return { mode, baseUrl: baseUrl.replace(/\/$/, ""), email, apiToken };
}

export function jiraAuthHeaders(config: JiraAuthConfig): Record<string, string> {
  if (config.mode !== "api_token" || !config.email || !config.apiToken) return {};
  const token = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  return {
    authorization: `Basic ${token}`,
    accept: "application/json",
    "content-type": "application/json"
  };
}
