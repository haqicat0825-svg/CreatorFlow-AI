export type DemoShowcase = {
  label: "演示案例";
  theme: string;
  research: {
    keyword: string;
    trendCount: number;
    hotTrends: string[];
    searchResultCount: number;
  };
  analysis: {
    trendTheme: string;
    heatScore: number;
    audience: string;
    opportunities: string[];
    recommendedTopics: string[];
  };
  writer: {
    titleCandidates: string[];
    title: string;
    body: string;
    tags: string[];
  };
  visual: {
    model: "Seedream";
    coverTitle: string;
    coverSubtitle: string;
    palette: [string, string, string];
  };
  draft: {
    reviewStatus: "待审核";
  };
};

export const DASHBOARD_DEMO_SHOWCASE: DemoShowcase = {
  label: "演示案例",
  theme: "韩系穿搭账号增长方案",
  research: {
    keyword: "韩系穿搭",
    trendCount: 12,
    hotTrends: ["低饱和通勤穿搭", "一衣多穿", "韩系松弛感"],
    searchResultCount: 28,
  },
  analysis: {
    trendTheme: "低饱和韩系通勤",
    heatScore: 92,
    audience: "22–30 岁城市通勤女性，关注显高、质感与可复用搭配",
    opportunities: ["用具体身材痛点切入，降低穿搭模仿门槛", "以一衣多穿系列建立稳定更新栏目"],
    recommendedTopics: ["小个子韩系通勤公式", "一件衬衫的 3 套松弛感穿法"],
  },
  writer: {
    titleCandidates: [
      "普通人也能照抄的韩系通勤公式",
      "一件衬衫，穿出 3 套韩系松弛感",
      "小个子通勤这样穿，显高又有质感",
    ],
    title: "普通人也能照抄的韩系通勤公式",
    body: "低饱和不是只穿黑白灰。用燕麦色打底、雾蓝色提亮，再保留一件有垂坠感的单品，就能穿出轻松又利落的韩系通勤感。",
    tags: ["韩系穿搭", "通勤穿搭", "一衣多穿", "小个子穿搭"],
  },
  visual: {
    model: "Seedream",
    coverTitle: "韩系通勤",
    coverSubtitle: "3 个显贵配色公式",
    palette: ["#c9b8a4", "#e9dfd3", "#85928c"],
  },
  draft: {
    reviewStatus: "待审核",
  },
};
