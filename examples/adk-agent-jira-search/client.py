import json
import os
import urllib.request


GATEWAY_URL = os.getenv("MCP_GATEWAY_URL", "http://localhost:4000").rstrip("/")
PROJECT_ID = os.getenv("MCP_PROJECT_ID", "ai-platform-demo")
EMAIL = os.getenv("MCP_DEV_EMAIL", "developer@example.com")


def post(path, payload, token=None):
    headers = {"content-type": "application/json"}
    if token:
        headers["authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        f"{GATEWAY_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


token = post("/auth/dev-token", {"email": EMAIL})["token"]
result = post(
    "/gateway/connectors/jira/tools/jira.search_issues/invoke",
    {
        "projectId": PROJECT_ID,
        "input": {
            "jql": "project = DEMO ORDER BY created DESC",
            "maxResults": 10,
        },
    },
    token,
)

print(json.dumps(result, indent=2))
