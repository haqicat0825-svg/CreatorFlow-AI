import type { TrendAnalysisAdapter, TrendAnalysisResult } from "./types";
import { validateResearchResults } from "./validation";

export const mockTrendAnalysisAdapter: TrendAnalysisAdapter = {
  id: "mock-analysis",
  async analyze(input) {
    const results = validateResearchResults(input);
    const ids = results.map((result) => result.id);
    const primary = results[0];
    const output: TrendAnalysisResult = {
      executiveSummary: `[MOCK] 基于 ${results.length} 条研究结果生成的趋势分析示例。`,
      trendSignals: [{
        signal: `[MOCK] ${primary.title} 所代表的话题正在获得关注。`,
        confidence: 0.5,
        evidenceResultIds: [primary.id],
      }],
      audienceInsights: [{
        insight: "[MOCK] 受众更关注可执行、具体且有证据支持的内容。",
        evidenceResultIds: ids,
      }],
      topicCandidates: [{
        title: `[MOCK] ${primary.title}：值得关注的变化`,
        angle: "[MOCK] 从研究证据中提炼变化与实际启示。",
        rationale: "[MOCK] 该候选主题直接对应输入研究结果。",
        evidenceResultIds: [primary.id],
      }],
      cautions: [{
        caution: "[MOCK] 此结果仅用于流程测试，不代表真实模型判断。",
        evidenceResultIds: ids,
      }],
      sourceReferences: results.map(({ id: resultId, title, sourceUrl }) => ({ resultId, title, sourceUrl })),
      metadata: {
        provider: "mock",
        model: "CreatorFlow Trend Analysis Mock",
        generatedAt: new Date(0).toISOString(),
        inputResultCount: results.length,
        schemaVersion: "1",
        isMock: true,
      },
    };
    return output;
  },
};
