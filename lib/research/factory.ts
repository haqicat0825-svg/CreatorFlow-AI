import type { ResearchAdapter } from "./types";
import { mockResearchAdapter } from "./mock-search";
import { XIAOHONGSHU_CLI_AUDIT, XiaohongshuCliAdapter } from "./xiaohongshu-cli";
import { ResearchError } from "./errors";

export function createResearchAdapter(): ResearchAdapter {
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
