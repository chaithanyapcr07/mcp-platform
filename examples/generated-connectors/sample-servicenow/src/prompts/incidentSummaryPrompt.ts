export function serviceNowIncidentSummaryPrompt() {
  return {
    name: "servicenow_incident_summary_prompt",
    description: "Summarize a ServiceNow incident for an incident commander.",
    template:
      "Summarize the incident, current state, priority, impacted service, and recommended next action. Do not include credentials or private user data."
  };
}

