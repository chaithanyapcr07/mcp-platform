export function getIncident(input: unknown) {
  return { mode: process.env.SERVICENOW_AUTH_MODE ?? "mock", incident: null, input };
}
