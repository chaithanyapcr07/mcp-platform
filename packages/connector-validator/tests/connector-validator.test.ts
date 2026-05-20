import { describe, expect, it } from "vitest";
import { validateConnectorRepo } from "../src/index.js";

describe("validateConnectorRepo", () => {
  it("validates the generated ServiceNow repo", () => {
    const result = validateConnectorRepo("../../generated-repos/servicenow-mcp-connector");

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

