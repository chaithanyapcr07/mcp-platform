import type { ServiceNowAuthConfig } from "./auth/serviceNowAuth.js";
import { createMockIncident, getMockIncident, searchMockIncidents, updateMockIncident } from "./mockServiceNow.js";

export class ServiceNowClient {
  constructor(private readonly config: ServiceNowAuthConfig) {}

  async searchIncidents(input: { query?: string; limit?: number }) {
    if (this.config.mode === "mock") {
      return { incidents: searchMockIncidents(input.query, input.limit), mode: "mock" };
    }
    return this.serviceNowRequest("/api/now/table/incident", "GET");
  }

  async getIncident(input: { number: string }) {
    if (this.config.mode === "mock") {
      return { incident: getMockIncident(input.number) ?? null, mode: "mock" };
    }
    return this.serviceNowRequest(`/api/now/table/incident?sysparm_query=number=${encodeURIComponent(input.number)}`, "GET");
  }

  async createIncident(input: { shortDescription: string; description?: string; priority?: "1" | "2" | "3" | "4" }) {
    if (this.config.mode === "mock") {
      return { incident: createMockIncident(input), mode: "mock" };
    }
    return this.serviceNowRequest("/api/now/table/incident", "POST", {
      short_description: input.shortDescription,
      description: input.description,
      priority: input.priority
    });
  }

  async updateIncident(input: { number: string; shortDescription?: string; description?: string; state?: "new" | "in_progress" | "resolved" }) {
    if (this.config.mode === "mock") {
      return { incident: updateMockIncident(input.number, input) ?? null, mode: "mock" };
    }
    return this.serviceNowRequest(`/api/now/table/incident?sysparm_query=number=${encodeURIComponent(input.number)}`, "PATCH", {
      short_description: input.shortDescription,
      description: input.description,
      state: input.state
    });
  }

  private async serviceNowRequest(path: string, method: string, body?: unknown) {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.config.apiToken}`,
        "content-type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`ServiceNow API returned ${response.status}`);
    }
    return { result: payload.result ?? payload, mode: "api_token" };
  }
}

