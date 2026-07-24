import { ResearchError } from "./errors";
import { RESEARCH_CONFIG } from "./types";

export class ResearchRateLimiter {
  private busy = false;
  private lastStartedAt = 0;

  async run<T>(work: () => Promise<T>, now = Date.now()): Promise<T> {
    if (this.busy) throw new ResearchError("SEARCH_BUSY", "已有搜索任务正在执行，请等待其完成。", 429);
    const remainingMs = RESEARCH_CONFIG.cooldownMs - (now - this.lastStartedAt);
    if (remainingMs > 0) {
      throw new ResearchError("RATE_LIMITED", `请等待 ${Math.ceil(remainingMs / 1000)} 秒后再次搜索。`, 429);
    }
    this.busy = true;
    this.lastStartedAt = now;
    try {
      return await work();
    } finally {
      this.busy = false;
    }
  }
}

export const researchRateLimiter = new ResearchRateLimiter();
