export function searchIncidents(input: unknown) {
  return { mode: process.env.SERVICENOW_AUTH_MODE ?? "mock", incidents: [], input };
}
