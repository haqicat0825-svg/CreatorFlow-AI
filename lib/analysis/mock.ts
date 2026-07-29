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
      viralElements: {
        colors: ["[MOCK] 奶油白", "[MOCK] 灰粉", "[MOCK] 黑白"],
        items: ["[MOCK] 针织衫", "[MOCK] 半裙", "[MOCK] 蝴蝶结"],
        styles: ["[MOCK] Soft Girl", "[MOCK] Clean Fit"],
        evidenceResultIds: ids,
      },
      audienceProfile: {
        ageRange: "[MOCK] 18-25岁",
        needs: ["[MOCK] 低成本复刻博主穿搭", "[MOCK] 获得可直接执行的搭配公式"],
        evidenceResultIds: ids,
      },
      audienceInsights: [{
        insight: "[MOCK] 受众更关注可执行、具体且有证据支持的内容。",
        evidenceResultIds: ids,
      }],
      viralReasons: [{
        reason: "[MOCK] 清晰的视觉标签、低门槛复刻路径和具体清单提高了收藏与互动意愿。",
        evidenceResultIds: ids,
      }],
      topicCandidates: Array.from({ length: 10 }, (_, index) => ({
        title: `[MOCK] ${index + 1}. ${primary.title}：可执行选题`,
        angle: `[MOCK] 角度 ${index + 1}：从研究证据提炼具体行动。`,
        rationale: "[MOCK] 该候选主题直接对应输入研究结果。",
        evidenceResultIds: [results[index % results.length].id],
      })),
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
