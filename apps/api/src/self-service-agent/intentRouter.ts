import type { ConnectorSystem, RoutedIntent } from "./agentTypes.js";

const knownSystems: Array<{ system: ConnectorSystem; aliases: string[] }> = [
  { system: "servicenow", aliases: ["servicenow", "service now"] },
  { system: "jira", aliases: ["jira"] },
  { system: "github-enterprise", aliases: ["github", "github enterprise"] },
  { system: "slack", aliases: ["slack"] },
  { system: "confluence", aliases: ["confluence"] }
];

export function inferSystem(message: string): ConnectorSystem | string {
  const lower = message.toLowerCase();
  const match = knownSystems.find((entry) => entry.aliases.some((alias) => lower.includes(alias)));
  if (match) return match.system;
  const connectorRepoMatch = lower.match(/(?:for|to)\s+([a-z][a-z0-9- ]{2,})/);
  if (connectorRepoMatch?.[1]) return connectorRepoMatch[1].trim().replace(/\s+/g, "-");
  return "unknown";
}

export function routeIntent(message: string): RoutedIntent {
  const lower = message.toLowerCase();
  const system = inferSystem(message);

  if (/(available connectors|connector catalog|registry|lookup|find connector|what connectors)/.test(lower)) {
    return { intent: "registry_lookup", system, reason: "User asked to inspect the registry or connector catalog." };
  }

  if (/(generate|create).*(connector repo|connector scaffold|connector repository)/.test(lower)) {
    return {
      intent: "generated_connector_repo_request",
      system,
      workflow: system !== "unknown" ? `generate-${system}-connector-repo` : undefined,
      reason: "User asked to generate a connector repo or scaffold."
    };
  }

  if (/search.*jira|jira.*search|jira issues|search.*issues/.test(lower)) {
    return {
      intent: "connector_tool_execution",
      system: "jira",
      connector: "jira",
      tool: "jira.search_issues",
      workflow: "search-jira-issues",
      reason: "User asked to search Jira issues."
    };
  }

  if (/(create|open|file).*(servicenow|service now).*(ticket|incident)|(servicenow|service now).*(create|open|file).*(ticket|incident)/.test(lower)) {
    return {
      intent: "connector_tool_execution",
      system: "servicenow",
      connector: "servicenow",
      tool: "servicenow.create_incident",
      workflow: "create-servicenow-ticket",
      reason: "User asked to create a ServiceNow ticket."
    };
  }

  if (/(create|open|file).*(jira).*(ticket|issue)|(jira).*(create|open|file).*(ticket|issue)/.test(lower)) {
    return {
      intent: "connector_tool_execution",
      system: "jira",
      connector: "jira",
      tool: "jira.create_issue",
      workflow: "create-jira-ticket",
      reason: "User asked to create a Jira issue."
    };
  }

  if (/access/.test(lower) && system !== "unknown") {
    return {
      intent: "existing_connector_access_request",
      system,
      connector: String(system),
      reason: "User asked for access to an existing connector."
    };
  }

  if (/onboard|connect my agent|use .*connector|connector onboarding/.test(lower) && system !== "unknown") {
    return {
      intent: "existing_connector_access_request",
      system,
      connector: String(system),
      reason: "User asked to onboard to a connector; planner will decide reuse or new build."
    };
  }

  return {
    intent: "unsupported_or_ambiguous_request",
    system,
    reason: "The request did not map to a supported self-service MCP workflow."
  };
}
