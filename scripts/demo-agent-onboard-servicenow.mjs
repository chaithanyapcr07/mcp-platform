import { devToken, printJson, request } from "./demo-utils.mjs";

const token = await devToken();
const { response, body } = await request("/agent/request", {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
  body: JSON.stringify({
    projectId: "ai-platform-demo",
    message: "Can you help me onboard to the ServiceNow connector?"
  })
});

printJson(`Agent ServiceNow onboarding (${response.status})`, body);
