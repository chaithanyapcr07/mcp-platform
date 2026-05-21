import { devToken, printJson, request } from "./demo-utils.mjs";

const token = await devToken();
const { response, body } = await request("/agent/request", {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
  body: JSON.stringify({
    projectId: "ai-platform-demo",
    message: "Can you create a ServiceNow ticket for this request?",
    context: {
      requestSummary: "User cannot access the claims dashboard",
      priority: "medium"
    }
  })
});

printJson(`Agent ServiceNow ticket request (${response.status})`, body);
