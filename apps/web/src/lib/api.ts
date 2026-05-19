const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function getDevToken(email: string) {
  const response = await fetch(`${API_URL}/auth/dev-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!response.ok) throw new Error("Unable to create dev token");
  return response.json() as Promise<{ token: string }>;
}

export async function api<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(options.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message ?? `Request failed: ${response.status}`);
  }
  return response.json();
}
