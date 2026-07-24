import { describe, expect, it } from "vitest";
import { GET as listItems } from "@/app/api/knowledge/items/route";
import { POST as searchKnowledge } from "@/app/api/knowledge/search/route";

describe("Knowledge API routes", () => {
  it("lists repository items without being captured by the dynamic ID route", async () => {
    const response = await listItems();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: expect.any(Array) });
  });

  it("searches through the existing repository", async () => {
    const response = await searchKnowledge(new Request("http://localhost/api/knowledge/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "route-validation", limit: 5 }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: expect.any(Array) });
  });

  it("rejects invalid search input locally", async () => {
    const response = await searchKnowledge(new Request("http://localhost/api/knowledge/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "", limit: 50 }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, error: { code: "INVALID_REQUEST" } });
  });
});
