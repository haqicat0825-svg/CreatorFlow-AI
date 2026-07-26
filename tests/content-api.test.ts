import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/generate/content/route";
import { validTrendContext } from "./fixtures/trend-context";

const validBrief = {
  topic: "秋季穿搭",
  audiences: ["18-25岁女生"],
  styles: ["韩系甜美"],
  goal: "种草",
  useIntelligence: false,
};

function request(body: unknown) {
  return new Request("http://localhost/api/generate/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  delete process.env.CREATORFLOW_TEXT_PROVIDER;
  delete process.env.OPENAI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
});

describe("POST /api/generate/content", () => {
  it("validates the Content Brief", async () => {
    const response = await POST(request({ ...validBrief, topic: "" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  });

  it("uses a clearly labelled mock fallback and never returns an API key", async () => {
    process.env.OPENAI_API_KEY = "should-never-appear";
    process.env.CREATORFLOW_TEXT_PROVIDER = "mock";
    const response = await POST(request(validBrief));
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("should-never-appear");
    expect(JSON.parse(text)).toMatchObject({
      success: true,
      data: {
        isMock: true,
        metadata: { provider: "mock" },
        ragUsed: false,
        ragReferences: [],
        sources: [],
        safetyReport: { copyingRisk: { status: "passed" } },
      },
    });
  });

  it("accepts the new brief plus TrendContext request envelope", async () => {
    process.env.CREATORFLOW_TEXT_PROVIDER = "mock";
    const response = await POST(request({ brief: validBrief, trendContext: validTrendContext }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: { isMock: true } });
  });

  it("returns configuration missing without exposing secrets", async () => {
    process.env.CREATORFLOW_TEXT_PROVIDER = "openai";
    const response = await POST(request(validBrief));
    const text = await response.text();
    expect(response.status).toBe(503);
    expect(text).not.toContain("Authorization");
    expect(JSON.parse(text)).toMatchObject({ error: { code: "CONFIGURATION_MISSING" } });
  });
});
