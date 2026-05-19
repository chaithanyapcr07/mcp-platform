import { describe, expect, it } from "vitest";
import { connector } from "./connector.js";

describe("local knowledge base connector", () => {
  it("searches items", async () => {
    const output = await connector.invoke("search_items", { query: "runbook" }, { requestId: "r1", secrets: {} });
    expect(output).toMatchObject({ items: expect.any(Array) });
  });
});
