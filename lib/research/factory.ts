import type { ResearchAdapter } from "./types";
import { mockResearchAdapter } from "./mock-search";
import { XIAOHONGSHU_CLI_AUDIT, XiaohongshuCliAdapter } from "./xiaohongshu-cli";
import { ResearchError } from "./errors";
import { TavilySearchAdapter } from "./tavily";

export function createResearchAdapter(
  provider = process.env.CREATORFLOW_RESEARCH_PROVIDER?.trim().toLowerCase() || "mock",
): ResearchAdapter {
  if (provider === "tavily") return new TavilySearchAdapter();
  if (provider === "mock") return mockResearchAdapter;
  if (provider !== "xiaohongshu-cli") return mockResearchAdapter;
  if (!XIAOHONGSHU_CLI_AUDIT.supportsStructuredReadOnlySearch) return mockResearchAdapter;
  const cli = new XiaohongshuCliAdapter();
  return {
    checkLoginStatus: () => cli.checkLoginStatus(),
    async searchContent(request) {
      try {
        return await cli.searchContent(request);
      } catch (error) {
        if (error instanceof ResearchError && ["LOGIN_REQUIRED", "CLI_UNAVAILABLE"].includes(error.code)) {
          return mockResearchAdapter.searchContent(request);
        }
        throw error;
      }
    },
  };
}
