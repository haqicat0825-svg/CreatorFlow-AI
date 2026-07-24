import { describe, expect, it } from "vitest";
import { runSafetyGuard } from "@/lib/content/safety-guard";
import { assessCopyingRisk } from "@/lib/content/copying-risk";
import { parseModelContent } from "@/lib/content/validation";
import { ModelAdapterError } from "@/lib/providers/types";

const validPayload = {
  titles: Array.from({ length: 5 }, (_, index) => ({
    id: `title-${index}`,
    title: `原创标题 ${index}`,
    match: 90 - index,
  })),
  body: "这是根据内容简报重新组织的完整正文。",
  tags: ["#内容"],
  coverPrompt: "原创封面提示词",
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

describe("model output validation and Safety Guard", () => {
  it("classifies an empty response", () => {
    expectCode(() => parseModelContent("   "), "EMPTY_RESPONSE");
  });

  it("removes one outer Markdown JSON fence", () => {
    expect(parseModelContent(`\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``).body)
      .toBe(validPayload.body);
  });

  it("classifies truncated JSON", () => {
    expectCode(() => parseModelContent('{"titles":['), "TRUNCATED_RESPONSE");
  });

  it("reports a safe field path for missing fields", () => {
    try {
      parseModelContent({ ...validPayload, body: undefined });
      throw new Error("expected schema failure");
    } catch (error) {
      expect(error).toMatchObject<ModelAdapterError>({
        code: "SCHEMA_MISMATCH",
        diagnostics: expect.objectContaining({ schemaErrorPath: "body" }),
      });
    }
  });

  it("normalizes comma-separated tags and numeric match strings", () => {
    const parsed = parseModelContent({
      ...validPayload,
      titles: validPayload.titles.map(item => ({ ...item, match: String(item.match) })),
      tags: "#结构, #表达",
    });
    expect(parsed.tags).toEqual(["#结构", "#表达"]);
    expect(parsed.titles[0].match).toBe(90);
  });

  it("does not convert a single title string into a titles array", () => {
    expectCode(
      () => parseModelContent({ ...validPayload, titles: "单个标题" }),
      "SCHEMA_MISMATCH",
    );
  });

  it("flags repeated titles and excessive marketing claims", () => {
    const report = runSafetyGuard({
      titles: Array.from({ length: 5 }, () => ({ title: "百分百保证最强效果" })),
      body: "百分百保证最强效果。".repeat(20),
    });
    expect(report.checks.find(check => check.id === "repeat")?.status).toBe("review");
    expect(report.checks.find(check => check.id === "marketing")?.status).toBe("review");
  });

  it("detects exact and highly similar copied titles", () => {
    const reference = [{ title: "秋季通勤穿搭的三个实用公式", content: "参考正文内容" }];
    expect(assessCopyingRisk({
      titles: [{ title: "秋季通勤穿搭的三个实用公式" }],
      body: "完全重新组织的正文。",
    }, reference).titleExactMatch).toBe(true);
    expect(assessCopyingRisk({
      titles: [{ title: "秋季通勤穿搭三个实用公式" }],
      body: "完全重新组织的正文。",
    }, reference).titleHighSimilarity).toBe(true);
  });

  it("detects a continuous long body fragment", () => {
    const fragment = "选择柔和配色并通过清晰层次建立稳定视觉重点同时保持整体节奏";
    const report = assessCopyingRisk({
      titles: [{ title: "重新设计的标题" }],
      body: `新的开头，${fragment}，然后补充不同结论。`,
    }, [{ title: "参考标题", content: `参考资料建议${fragment}并控制整体节奏。` }]);
    expect(report.bodyLongOverlap).toBe(true);
  });
});

function expectCode(work: () => unknown, code: string) {
  try {
    work();
    throw new Error("expected failure");
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}
