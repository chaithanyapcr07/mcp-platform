import { describe, expect, it } from "vitest";
import { getIncident } from "../src/tools/getIncident.js";
import { searchIncidents } from "../src/tools/searchIncidents.js";

describe("sample ServiceNow connector", () => {
  it("searches mock incidents", async () => {
    const result = await searchIncidents({ query: "priority=1", limit: 10 });

    expect(result.count).toBe(1);
    expect(result.incidents[0]?.number).toBe("INC0010001");
  });

  it("gets an incident by number", async () => {
    const result = await getIncident({ number: "INC0010002" });

    expect(result.found).toBe(true);
    expect(result.incident?.assignmentGroup).toBe("Platform");
  });
});

