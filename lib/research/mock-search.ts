import { createHash } from "node:crypto";
import type { ResearchAdapter, SearchRequest, SearchResult } from "./types";

export const mockResearchAdapter: ResearchAdapter = {
  async checkLoginStatus() {
    return {
      available: false,
      loggedIn: false,
      provider: "mock",
      safeMessage: "本机未检测到可安全调用的 xiaohongshu-cli，当前使用 Demo/Mock 研究数据。",
    };
  },
  async searchContent(request: SearchRequest) {
    const now = new Date().toISOString();
    return createMockResults(request.query, now).slice(0, request.limit);
  },
};

function createMockResults(query: string, retrievedAt: string): SearchResult[] {
  const samples = [
    ["场景化标题拆解", "示例研究条目：用具体使用场景、目标人群和可执行收益组织标题。", ["标题结构", "场景"]],
    ["内容结构观察", "示例研究条目：开头交代问题，中段给步骤，结尾提示限制和适用范围。", ["内容结构", "表达"]],
    ["视觉信息层级", "示例研究条目：封面仅保留一个主信息和一个辅助信息，避免虚构互动指标。", ["视觉", "信息层级"]],
  ] as const;
  return samples.map(([title, summary, tags], index) => ({
    id: createHash("sha256").update(`mock:${query}:${index}`).digest("hex").slice(0, 20),
    title: `${query} · ${title}`,
    summary,
    sourceUrl: `https://example.invalid/creatorflow-research/${index + 1}`,
    tags: [query, ...tags],
    source: "xiaohongshu",
    retrievedAt,
    isMock: true,
  }));
}
