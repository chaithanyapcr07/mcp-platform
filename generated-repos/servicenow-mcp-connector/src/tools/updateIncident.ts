export function updateIncident(input: unknown) {
  return { mode: process.env.SERVICENOW_AUTH_MODE ?? "mock", approvalRequired: true, input };
}
