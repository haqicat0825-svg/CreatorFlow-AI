import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelAdapterError } from "@/lib/providers/types";

const analyze = vi.fn();

vi.mock("@/lib/analysis/factory", () => ({
  createTrendAnalysisAdapter: () => ({ id: "test-analysis", analyze }),
}));

import { POST } from "@/app/api/research/analyze/route";

const evidence = {
  id: "result-1",
  title: "Evidence title",
  summary: "Evidence summary",
  sourceUrl: "https://example.com/evidence",
  tags: ["trend"],
  source: "tavily",
  retrievedAt: "2026-07-26T00:00:00.000Z",
  isMock: true,
};

const analysis = {
  executiveSummary: "[MOCK] Supported summary.",
  trendSignals: [{ signal: "Signal", confidence: 0.8, evidenceResultIds: ["result-1"] }],
  audienceInsights: [{ insight: "Insight", evidenceResultIds: ["result-1"] }],
  topicCandidates: [{
    title: "Topic",
    angle: "Angle",
    rationale: "Rationale",
    evidenceResultIds: ["result-1"],
  }],
  cautions: [{ caution: "Caution", evidenceResultIds: ["result-1"] }],
  sourceReferences: [{
    resultId: "result-1",
    title: "Evidence title",
    sourceUrl: "https://example.com/evidence",
  }],
  metadata: {
    provider: "mock",
    model: "test mock",
    generatedAt: "2026-07-26T00:00:00.000Z",
    inputResultCount: 1,
    schemaVersion: "1",
    isMock: true,
  },
};

function request(body: unknown) {
  return new Request("http://localhost/api/research/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function response(body: unknown) {
  const result = await POST(request(body));
  return { status: result.status, json: await result.json() };
}

describe("POST /api/research/analyze", () => {
  beforeEach(() => {
    analyze.mockReset();
    analyze.mockResolvedValue(analysis);
  });

  it("returns a validated mock analysis without calling a real API", async () => {
    const result = await response({ query: "creator trends", selectedResults: [evidence], context: "Optional context" });
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ success: true, data: analysis });
    expect(analyze).toHaveBeenCalledOnce();
    expect(analyze).toHaveBeenCalledWith([evidence]);
  });

  it("rejects empty evidence", async () => {
    const result = await response({ query: "creator trends", selectedResults: [] });
    expect(result).toMatchObject({ status: 422, json: { error: { code: "INSUFFICIENT_EVIDENCE" } } });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects too many selected results", async () => {
    const selectedResults = Array.from({ length: 11 }, (_, index) => ({ ...evidence, id: `result-${index}` }));
    const result = await response({ query: "creator trends", selectedResults });
    expect(result).toMatchObject({ status: 413, json: { error: { code: "INPUT_TOO_LARGE" } } });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects invalid evidence", async () => {
    const result = await response({ query: "creator trends", selectedResults: [{ ...evidence, sourceUrl: "file:///secret" }] });
    expect(result).toMatchObject({ status: 400, json: { error: { code: "INVALID_REQUEST" } } });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects client-controlled provider, model, and API key fields", async () => {
    for (const forbidden of [
      { provider: "deepseek" },
      { model: "some-model" },
      { apiKey: "secret" },
    ]) {
      const result = await response({ query: "creator trends", selectedResults: [evidence], ...forbidden });
      expect(result).toMatchObject({ status: 400, json: { error: { code: "INVALID_REQUEST" } } });
    }
    expect(analyze).not.toHaveBeenCalled();
  });

  it("maps provider errors to the public error contract", async () => {
    analyze.mockRejectedValueOnce(new ModelAdapterError("UPSTREAM_ERROR", "sensitive upstream detail", 502));
    const result = await response({ query: "creator trends", selectedResults: [evidence] });
    expect(result).toMatchObject({ status: 502, json: { error: { code: "UPSTREAM_ERROR" } } });
    expect(JSON.stringify(result.json)).not.toContain("sensitive upstream detail");
  });

  it("rejects an invalid provider response", async () => {
    analyze.mockResolvedValueOnce({
      ...analysis,
      trendSignals: [{ signal: "Unsupported", confidence: 1, evidenceResultIds: ["invented"] }],
    });
    const result = await response({ query: "creator trends", selectedResults: [evidence] });
    expect(result).toMatchObject({ status: 502, json: { error: { code: "UPSTREAM_ERROR" } } });
  });
});
