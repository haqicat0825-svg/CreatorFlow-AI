import { describe, expect, it, vi } from "vitest";
import { ResearchError } from "@/lib/research/errors";
import { createResearchAdapter } from "@/lib/research/factory";
import { validateSearchResult } from "@/lib/research/normalizer";
import { TavilySearchAdapter } from "@/lib/research/tavily";

const request = {
  query: "韩系穿搭",
  limit: 2,
  sortMode: "general" as const,
  contentType: "all" as const,
};

describe("TavilySearchAdapter", () => {
  it("maps a successful Tavily response to SearchResult values", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      results: [{
        title: "韩系穿搭指南",
        url: "https://example.com/korean-style",
        content: "适合日常创作参考的穿搭趋势摘要。",
        score: 0.91,
      }],
    }), { status: 200 }));
    const adapter = new TavilySearchAdapter({ apiKey: "test-key", fetcher });

    const results = await adapter.searchContent(request);

    expect(results).toEqual([expect.objectContaining({
      title: "韩系穿搭指南",
      summary: "适合日常创作参考的穿搭趋势摘要。",
      sourceUrl: "https://example.com/korean-style",
      metrics: { relevanceScore: 0.91 },
      source: "tavily",
      isMock: false,
    })]);
    expect(results[0].id).toHaveLength(20);
    expect(validateSearchResult(results[0]).source).toBe("tavily");
    expect(fetcher).toHaveBeenCalledWith("https://api.tavily.com/search", expect.objectContaining({
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
    }));
    const body = JSON.parse(String(fetcher.mock.calls[0][1].body));
    expect(body).toEqual({
      query: "韩系穿搭",
      search_depth: "basic",
      max_results: 2,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
    });
  });

  it("rejects searches when the API key is missing", async () => {
    const adapter = new TavilySearchAdapter({ apiKey: "", fetcher: vi.fn() });

    await expect(adapter.searchContent(request)).rejects.toMatchObject({
      code: "CONFIGURATION_MISSING",
      status: 503,
    });
  });

  it("maps a 401 response without exposing the API key", async () => {
    const adapter = new TavilySearchAdapter({
      apiKey: "secret-key",
      fetcher: vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })),
    });

    const error = await adapter.searchContent(request).catch(cause => cause);
    expect(error).toBeInstanceOf(ResearchError);
    expect(error).toMatchObject({ code: "CONFIGURATION_MISSING", status: 503 });
    expect(String(error.message)).not.toContain("secret-key");
  });

  it("maps an aborted fetch to TIMEOUT", async () => {
    const fetcher = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const adapter = new TavilySearchAdapter({ apiKey: "test-key", fetcher, timeoutMs: 5 });

    await expect(adapter.searchContent(request)).rejects.toMatchObject({
      code: "TIMEOUT",
      status: 504,
    });
  });

  it("rejects malformed successful responses", async () => {
    const adapter = new TavilySearchAdapter({
      apiKey: "test-key",
      fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify({
        results: [{ title: "missing fields" }],
      }), { status: 200 })),
    });

    await expect(adapter.searchContent(request)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      status: 502,
    });
  });

  it("keeps mock as the default factory provider and allows explicit switches", () => {
    expect(createResearchAdapter().constructor.name).not.toBe("TavilySearchAdapter");
    expect(createResearchAdapter("tavily")).toBeInstanceOf(TavilySearchAdapter);
    expect(createResearchAdapter("mock").constructor.name).not.toBe("TavilySearchAdapter");
  });
});
