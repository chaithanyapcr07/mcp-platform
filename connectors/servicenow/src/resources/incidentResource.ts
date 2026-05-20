import type { ServiceNowClient } from "../client.js";

export const incidentResource = {
  name: "servicenow_incident",
  uri: "servicenow://incidents/{number}",
  description: "Read-only ServiceNow incident resource."
};

export async function readIncidentResource(client: ServiceNowClient, uri: string) {
  const number = uri.split("/").pop() ?? "";
  const result = await client.getIncident({ number });
  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(result, null, 2)
  };
}

