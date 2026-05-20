const apiUrl = process.env.MCP_GATEWAY_URL ?? process.env.API_URL ?? "http://localhost:4000";

export function gatewayUrl() {
  return apiUrl.replace(/\/$/, "");
}

export async function request(path, options = {}) {
  const response = await fetch(`${gatewayUrl()}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { response, body };
}

export async function devToken(email = "developer@example.com") {
  const { response, body } = await request("/auth/dev-token", {
    method: "POST",
    body: JSON.stringify({ email })
  });
  if (!response.ok) {
    throw new Error(`Unable to mint dev token for ${email}: ${JSON.stringify(body)}`);
  }
  return body.token;
}

export function printJson(label, value) {
  console.log(`${label}:`);
  console.log(JSON.stringify(value, null, 2));
}
