import { describe, expect, it } from "vitest";
import { ServiceNowClient } from "../src/client.js";

const client = new ServiceNowClient({ mode: "mock" });

describe("ServiceNow connector", () => {
  it("searches mock incidents", async () => {
    const result = await client.searchIncidents({ query: "checkout", limit: 10 }) as { mode: string; incidents: unknown[] };
    expect(result.mode).toBe("mock");
    expect(result.incidents.length).toBeGreaterThan(0);
  });

  it("creates and updates a mock incident", async () => {
    const created = await client.createIncident({ shortDescription: "Generated incident", priority: "2" }) as { incident: { number: string } };
    expect(created.incident.number).toMatch(/^INC/);
    const updated = await client.updateIncident({ number: created.incident.number, state: "in_progress" }) as { incident: { state: string } | null };
    expect(updated.incident?.state).toBe("in_progress");
  });
});
