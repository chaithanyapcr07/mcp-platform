import { devToken, printJson, request } from "./demo-utils.mjs";

const token = process.env.DEV_TOKEN ?? await devToken("developer@example.com");
const intake = await request("/onboarding/agent/intake", {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
  body: JSON.stringify({
    request: "I need my incident-response agent to use Workday HR cases, with read access first and write tools gated by approval.",
    projectId: "ai-platform-demo",
    team: "people-platform",
    ownerTeam: "people-platform",
    expectedVolume: "250 requests/day"
  })
});

if (!intake.response.ok) {
  printJson("Onboarding agent intake failed", intake.body);
  process.exit(1);
}

printJson("Onboarding agent recommendation", {
  recommendation: intake.body.recommendation,
  request: {
    id: intake.body.request.id,
    type: intake.body.request.type,
    status: intake.body.request.status,
    desiredSystem: intake.body.request.desiredSystem,
    connectorId: intake.body.request.connectorId,
    requestedTools: intake.body.request.requestedTools,
    artifacts: intake.body.request.artifacts?.map((artifact) => artifact.name)
  }
});
