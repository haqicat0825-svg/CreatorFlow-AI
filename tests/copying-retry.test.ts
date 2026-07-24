import { describe, expect, it, vi } from "vitest";
import { generateWithCopyingGuard } from "@/lib/content/generate-with-copying";
import type { TextModelAdapter } from "@/lib/providers/types";

const brief = {
  topic: "秋季穿搭",
  audiences: ["通勤女性"],
  styles: ["简约"],
  goal: "种草" as const,
  useIntelligence: true,
};
const referenceTitle = "秋季通勤穿搭的三个实用公式";
const safeOutput = {
  titles: Array.from({ length: 5 }, (_, index) => ({
    id: `safe-${index}`,
    title: `重新组织的原创方向 ${index}`,
    match: 90 - index,
  })),
  body: "从内容简报重新梳理需求，先说明适用场景，再给出组合思路，最后提醒读者按照自身情况选择。",
  tags: ["#穿搭"],
  coverPrompt: "简约秋季穿搭封面",
  safetyReport: {
    score: 100,
    checks: [],
    copyingRisk: {
      status: "passed",
      titleExactMatch: false,
      titleHighSimilarity: false,
      bodyLongOverlap: false,
      regenerated: false,
    },
  },
};
const riskyOutput = {
  ...safeOutput,
  titles: safeOutput.titles.map((item, index) => ({
    ...item,
    title: index === 0 ? referenceTitle : item.title,
  })),
};
const rag = {
  text: "reference",
  sources: [{
    id: "knowledge-1",
    title: referenceTitle,
    sourceType: "article" as const,
    matchedReason: "匹配关键词：秋季穿搭",
    isMock: false,
  }],
  materials: [{ title: referenceTitle, content: "参考资料正文不应被连续复制。" }],
};

function adapterWith(...outputs: unknown[]) {
  return {
    id: "test",
    model: "test",
    testConnection: vi.fn(),
    generate: vi.fn()
      .mockResolvedValueOnce(outputs[0])
      .mockResolvedValueOnce(outputs[1]),
  } satisfies TextModelAdapter;
}

describe("copying-risk regeneration", () => {
  it("regenerates at most once and accepts a safer second draft", async () => {
    const adapter = adapterWith(riskyOutput, safeOutput);
    const result = await generateWithCopyingGuard(adapter, brief, rag);
    expect(adapter.generate).toHaveBeenCalledTimes(2);
    expect(adapter.generate).toHaveBeenLastCalledWith(
      brief,
      expect.objectContaining({ copyingRiskRetry: true }),
    );
    expect(result.safetyReport.copyingRisk.status).toBe("passed");
    expect(result.safetyReport.copyingRisk.regenerated).toBe(true);
  });

  it("returns a manual-review warning when the second draft is still risky", async () => {
    const adapter = adapterWith(riskyOutput, riskyOutput);
    const result = await generateWithCopyingGuard(adapter, brief, rag);
    expect(adapter.generate).toHaveBeenCalledTimes(2);
    expect(result.safetyReport.copyingRisk).toMatchObject({
      status: "review",
      regenerated: true,
      titleExactMatch: true,
    });
    expect(result.safetyReport.copyingRisk.warning).toMatch(/人工审核/);
  });
});
