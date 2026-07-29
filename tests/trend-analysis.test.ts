import { describe, expect, it, vi } from "vitest";
import { createTrendAnalysisAdapter } from "@/lib/analysis/factory";
import { mockTrendAnalysisAdapter } from "@/lib/analysis/mock";
import { validateTrendAnalysisCore } from "@/lib/analysis/validation";
import type { SearchResult } from "@/lib/research/types";

const research: SearchResult[] = Array.from({ length: 3 }, (_, index) => ({
  id: `result-${index + 1}`,
  title: `Evidence title ${index + 1}`,
  summary: `Evidence summary ${index + 1}`,
  sourceUrl: `https://example.com/evidence-${index + 1}`,
  tags: ["trend"],
  source: "tavily" as const,
  retrievedAt: "2026-07-26T00:00:00.000Z",
  isMock: false,
}));

const validCore = {
  executiveSummary: "韩系低饱和穿搭持续增长。",
  trendSignals: [{ signal: "低饱和穿搭关注度上升", confidence: 0.8, evidenceResultIds: ["result-1"] }],
  viralElements: {
    colors: ["奶油白", "灰粉", "黑白"],
    items: ["针织衫", "半裙", "蝴蝶结"],
    styles: ["Soft Girl", "Clean Fit"],
    evidenceResultIds: ["result-1", "result-2"],
  },
  audienceProfile: {
    ageRange: "18-25岁",
    needs: ["低成本复制博主穿搭"],
    evidenceResultIds: ["result-1"],
  },
  audienceInsights: [{ insight: "年轻用户偏好可复制方案", evidenceResultIds: ["result-1"] }],
  viralReasons: [{ reason: "低门槛清单提高收藏意愿", evidenceResultIds: ["result-2"] }],
  topicCandidates: Array.from({ length: 10 }, (_, index) => ({
    title: `推荐选题 ${index + 1}`,
    angle: `角度 ${index + 1}`,
    rationale: "由研究证据支持",
    evidenceResultIds: [`result-${index % 3 + 1}`],
  })),
  cautions: [{ caution: "不能将网页热度等同于小红书热度", evidenceResultIds: ["result-3"] }],
};

const singleResearch: SearchResult = {
  id: "result-1",
  title: "Evidence title",
  summary: "Evidence summary",
  sourceUrl: "https://example.com/evidence",
  tags: ["trend"],
  source: "tavily",
  retrievedAt: "2026-07-26T00:00:00.000Z",
  isMock: false,
};

describe("trend analysis", () => {
  it("returns a clearly marked mock analysis", async () => {
    const result = await mockTrendAnalysisAdapter.analyze(research);
    expect(result.metadata).toMatchObject({ provider: "mock", isMock: true, inputResultCount: 3 });
    expect(result.executiveSummary).toContain("[MOCK]");
    expect(result.topicCandidates).toHaveLength(10);
    expect(result.sourceReferences).toHaveLength(3);
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

  it("rejects fewer than three research results", async () => {
    await expect(mockTrendAnalysisAdapter.analyze([singleResearch])).rejects.toThrow(/3 to 10 research results/);
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
