import type { ImageModelAdapter, TextModelAdapter } from "./types";

export const mockTextAdapter: TextModelAdapter = {
  id: "mock-deepseek",
  model: "DeepSeek-V4",
  async testConnection() {
    return {
      upstreamConnected: false,
      contentContractValid: null,
      diagnostics: {
        upstreamConnected: false,
        choicesCount: 1,
        contentPresent: true,
        contentLength: 1,
        contentEmpty: false,
        hasMarkdownFence: false,
        contentContractValid: null,
      },
    };
  },
  async generate(task) {
    const titles = [
      `${task.topic}｜不费力的温柔感`,
      `首尔女生都在用的 ${task.topic} 公式`,
      `${task.topic}：3 个可以直接照搬的技巧`,
      `低预算也能穿出 ${task.styles[0] ?? "高级感"}`,
      `从通勤到约会，一套 ${task.topic} 搞定`,
    ].map((title, index) => ({ id: `generated-${index}`, title, match: 97 - index * 2 }));
    return {
      titles,
      body: `最近很喜欢这种不刻意的${task.styles[0] ?? "韩系"}氛围。围绕「${task.topic}」，用柔软材质、低饱和配色和一点层次感，就能把松弛与精致同时穿在身上。\n\n这次为${task.audiences.join("、")}整理了三个可以直接照搬的搭配思路，让日常造型更轻盈，也更容易被记住。`,
      tags: ["#韩系穿搭", "#秋日灵感", `#${task.goal}`],
      coverPrompt: `${task.topic}，${task.styles.join("、")}，自然光，低饱和奶油色调，韩系杂志封面构图，留出标题空间`,
      safetyReport: {
        score: 92,
        checks: [
          { id: "hollow", label: "是否存在空洞描述", status: "passed" },
          { id: "repeat", label: "是否重复内容", status: "passed" },
          { id: "marketing", label: "是否过度营销", status: "review" },
          { id: "platform", label: "是否符合平台规范", status: "passed" },
        ],
        copyingRisk: {
          status: "passed",
          titleExactMatch: false,
          titleHighSimilarity: false,
          bodyLongOverlap: false,
          regenerated: false,
        },
      },
      metadata: { provider: "mock", model: "CreatorFlow Demo" },
      isMock: true,
      ragUsed: false,
      ragReferences: [],
      sources: [],
    };
  },
};

export const mockImageAdapter: ImageModelAdapter = {
  id: "mock-image",
  model: "DALL-E",
  async generatePrompt(task) {
    return { prompt: `${task.topic}，${task.styles.join("、")}，自然光，低饱和奶油色调，韩系杂志封面，3:4` };
  },
};
