import { describe, expect, it, vi } from "vitest";
import { createTrendAnalysisAdapter } from "@/lib/analysis/factory";
import { mockTrendAnalysisAdapter } from "@/lib/analysis/mock";
import { validateTrendAnalysisCore } from "@/lib/analysis/validation";
import type { SearchResult } from "@/lib/research/types";

const research: SearchResult[] = [{
  id: "result-1",
  title: "Evidence title",
  summary: "Evidence summary",
  sourceUrl: "https://example.com/evidence",
  tags: ["trend"],
  source: "tavily",
  retrievedAt: "2026-07-26T00:00:00.000Z",
  isMock: false,
}];

const validCore = {
  executiveSummary: "A supported summary.",
  trendSignals: [{ signal: "A signal", confidence: 0.8, evidenceResultIds: ["result-1"] }],
  audienceInsights: [{ insight: "An insight", evidenceResultIds: ["result-1"] }],
  topicCandidates: [{
    title: "A topic",
    angle: "An angle",
    rationale: "A rationale",
    evidenceResultIds: ["result-1"],
  }],
  cautions: [{ caution: "A caution", evidenceResultIds: ["result-1"] }],
};

describe("trend analysis", () => {
  it("returns a clearly marked mock analysis", async () => {
    const result = await mockTrendAnalysisAdapter.analyze(research);
    expect(result.metadata).toMatchObject({ provider: "mock", isMock: true, inputResultCount: 1 });
    expect(result.executiveSummary).toContain("[MOCK]");
    expect(result.sourceReferences).toEqual([{
      resultId: "result-1",
      title: "Evidence title",
      sourceUrl: "https://example.com/evidence",
    }]);
  });

  it("validates the complete analysis schema", () => {
    expect(validateTrendAnalysisCore(validCore, research)).toEqual(validCore);
    expect(() => validateTrendAnalysisCore({ ...validCore, unexpected: true }, research))
      .toThrow(/JSON Schema/);
  });

  it("rejects evidence ids not present in the research input", () => {
    const invalid = {
      ...validCore,
      trendSignals: [{ ...validCore.trendSignals[0], evidenceResultIds: ["invented-id"] }],
    };
    expect(() => validateTrendAnalysisCore(invalid, research)).toThrow(/unknown research result id/);
  });

  it("rejects URLs generated inside model analysis fields", () => {
    expect(() => validateTrendAnalysisCore({
      ...validCore,
      executiveSummary: "See https://invented.example for details.",
    }, research)).toThrow(/URLs are not allowed/);
  });

  it("rejects empty research results", async () => {
    await expect(mockTrendAnalysisAdapter.analyze([])).rejects.toThrow(/at least one research result/);
  });

  it("switches between mock and DeepSeek without calling a real API", async () => {
    expect(createTrendAnalysisAdapter({
      env: { NODE_ENV: "test", CREATORFLOW_TEXT_PROVIDER: "mock" },
    }).id).toBe("mock-analysis");

    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(validCore) } }],
    }), { status: 200 }));
    const adapter = createTrendAnalysisAdapter({
      env: {
        NODE_ENV: "test",
        CREATORFLOW_TEXT_PROVIDER: "deepseek",
        DEEPSEEK_API_KEY: "test-only",
      },
      fetch: fetcher,
      now: () => new Date("2026-07-26T12:00:00.000Z"),
    });
    const result = await adapter.analyze(research);
    expect(adapter.id).toBe("deepseek-analysis");
    expect(result.metadata).toMatchObject({ provider: "deepseek", isMock: false });
    expect(fetcher).toHaveBeenCalledOnce();
    const request = JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body));
    expect(request.messages[1].content).not.toContain(research[0].sourceUrl);
    expect(JSON.stringify(result.sourceReferences)).toContain(research[0].sourceUrl);
  });
});
