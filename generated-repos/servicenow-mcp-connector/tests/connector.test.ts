import { describe, expect, it } from "vitest";
import { createIncident } from "../src/tools/createIncident.js";
import { searchIncidents } from "../src/tools/searchIncidents.js";

describe("generated ServiceNow connector", () => {
  it("runs read tools in mock mode", () => {
    expect(searchIncidents({ query: "priority=1" }).mode).toBeTruthy();
  });

  it("marks write tools as approval required", () => {
    expect(createIncident({ shortDescription: "Example" }).approvalRequired).toBe(true);
  });
});
