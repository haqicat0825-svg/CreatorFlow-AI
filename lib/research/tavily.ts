import { createHash } from "node:crypto";
import { ResearchError } from "./errors";
import { RESEARCH_CONFIG, type LoginStatus, type ResearchAdapter, type SearchRequest, type SearchResult } from "./types";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

type TavilySearchAdapterOptions = {
  apiKey?: string;
  fetcher?: (input: string, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number;
};

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export class TavilySearchAdapter implements ResearchAdapter {
  private readonly apiKey: string;
  private readonly fetcher: (input: string, init?: RequestInit) => Promise<Response>;
  private readonly timeoutMs: number;

  constructor(options: TavilySearchAdapterOptions = {}) {
    this.apiKey = options.apiKey?.trim() ?? process.env.TAVILY_API_KEY?.trim() ?? "";
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? RESEARCH_CONFIG.timeoutMs;
  }

  async checkLoginStatus(): Promise<LoginStatus> {
    const configured = Boolean(this.apiKey);
    return {
      available: configured,
      loggedIn: configured,
      provider: "tavily",
      safeMessage: configured
        ? "Tavily Search API 已配置；搜索将返回真实网页结果。"
        : "Tavily Search API 尚未配置；请在服务端设置 TAVILY_API_KEY。",
    };
  }

  async searchContent(request: SearchRequest): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new ResearchError("CONFIGURATION_MISSING", "Tavily Search API 尚未配置。", 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;

    try {
      response = await this.fetcher(TAVILY_SEARCH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: request.query,
          search_depth: "basic",
          max_results: request.limit,
          include_answer: false,
          include_raw_content: false,
          include_images: false,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new ResearchError("TIMEOUT", "Tavily 搜索请求超时。", 504);
      }
      throw new ResearchError("NETWORK_ERROR", "无法连接 Tavily Search API。", 502);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401) {
      throw new ResearchError("CONFIGURATION_MISSING", "Tavily API Key 无效或未获授权。", 503);
    }
    if (response.status === 429) {
      throw new ResearchError("RATE_LIMITED", "Tavily 搜索请求过于频繁，请稍后再试。", 429);
    }
    if (!response.ok) {
      throw new ResearchError("NETWORK_ERROR", "Tavily Search API 暂时不可用。", 502);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ResearchError("INVALID_RESPONSE", "Tavily 返回了无效响应。", 502);
    }

    const results = parseTavilyResults(payload);
    const retrievedAt = new Date().toISOString();
    return results.slice(0, request.limit).map(result => ({
      id: createHash("sha256").update(`tavily:${result.url}`).digest("hex").slice(0, 20),
      title: result.title,
      summary: result.content,
      sourceUrl: result.url,
      metrics: typeof result.score === "number" && Number.isFinite(result.score)
        ? { relevanceScore: result.score }
        : undefined,
      tags: [request.query],
      source: "tavily",
      retrievedAt,
      isMock: false,
    }));
  }
}

function parseTavilyResults(payload: unknown): TavilyResult[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>).results)) {
    throw new ResearchError("INVALID_RESPONSE", "Tavily 返回的搜索结果格式无效。", 502);
  }

  return (payload as { results: unknown[] }).results.map(item => {
    if (!item || typeof item !== "object") {
      throw new ResearchError("INVALID_RESPONSE", "Tavily 返回的搜索条目格式无效。", 502);
    }
    const value = item as Record<string, unknown>;
    if (
      typeof value.title !== "string" || !value.title.trim()
      || typeof value.url !== "string" || !isHttpUrl(value.url)
      || typeof value.content !== "string" || !value.content.trim()
    ) {
      throw new ResearchError("INVALID_RESPONSE", "Tavily 返回的搜索条目缺少必要字段。", 502);
    }
    return {
      title: value.title.trim(),
      url: value.url,
      content: value.content.trim(),
      score: typeof value.score === "number" ? value.score : undefined,
    };
  });
}

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isAbortError(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as { name?: unknown }).name === "AbortError");
}
