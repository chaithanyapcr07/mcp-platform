import { mockIncidents } from "../fixtures.js";

export function readIncidentResource(number: string) {
  const incident = mockIncidents.find((item) => item.number === number);

  return {
    uri: `servicenow://incidents/${number}`,
    mimeType: "application/json",
    text: JSON.stringify({ incident }, null, 2)
  };
}

