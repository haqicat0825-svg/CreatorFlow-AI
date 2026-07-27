import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KnowledgeLibrary } from "@/components/knowledge-library";

describe("KnowledgeLibrary content assets", () => {
  beforeEach(() => {
    if (!window.localStorage) Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage() });
    window.localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders an imported Xiaohongshu note as a complete image card", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: [{
        id: "knowledge-1",
        title: "韩系通勤穿搭",
        content: "RAG 使用的正文摘要不应作为卡片主体。",
        summary: "适合通勤场景的韩系搭配。",
        sourceType: "xiaohongshu",
        sourceUrl: "https://www.xiaohongshu.com/explore/note-1",
        author: "穿搭作者",
        coverImage: "https://sns-img.example.com/cover.jpg",
        images: ["https://sns-img.example.com/cover.jpg"],
        likes: 1234,
        saves: 88,
        comments: 12,
        tags: ["韩系", "通勤"],
        contentType: "reference",
        createdAt: "2026-07-27T00:00:00.000Z",
        updatedAt: "2026-07-27T00:00:00.000Z",
        qualityStatus: "approved",
        authenticityStatus: "verified",
      }],
    }))));

    render(<KnowledgeLibrary />);

    expect(await screen.findByRole("img", { name: "韩系通勤穿搭封面" })).toHaveAttribute(
      "src",
      "https://sns-img.example.com/cover.jpg",
    );
    expect(screen.getByText("韩系通勤穿搭")).toBeInTheDocument();
    expect(screen.getByText("作者：穿搭作者")).toBeInTheDocument();
    expect(screen.getByText("点赞 1,234")).toBeInTheDocument();
    expect(screen.getByText("收藏 88")).toBeInTheDocument();
    expect(screen.getByText("韩系")).toBeInTheDocument();
    expect(screen.getByText("来源：小红书")).toBeInTheDocument();
    expect(screen.queryByText("RAG 使用的正文摘要不应作为卡片主体。")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开来源：韩系通勤穿搭" })).toHaveAttribute(
      "href",
      "https://www.xiaohongshu.com/explore/note-1",
    );
  });

  it("lets an AI library image become the current Creator cover", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: [{
        id: "ai-image-1",
        category: "ai_image",
        title: "AI 图片 · 韩系穿搭",
        content: "韩系穿搭封面",
        sourceType: "other",
        imageUrl: "https://example.com/library-cover.png",
        prompt: "韩系穿搭封面",
        provider: "volcengine-jimeng",
        model: "seedream",
        tags: ["AI图片"],
        contentType: "reference",
        createdAt: "2026-07-27T00:00:00.000Z",
        updatedAt: "2026-07-27T00:00:00.000Z",
        qualityStatus: "approved",
        authenticityStatus: "verified",
      }],
    }))));
    const user = userEvent.setup();
    render(<KnowledgeLibrary category="ai_image" />);

    await user.click(await screen.findByRole("button", { name: "设为当前封面：AI 图片 · 韩系穿搭" }));
    expect(JSON.parse(window.localStorage.getItem("creatorflow-selected-cover") ?? "{}")).toMatchObject({
      imageUrl: "https://example.com/library-cover.png",
      source: "library",
      imageId: "ai-image-1",
    });
    expect(screen.getByRole("button", { name: "当前封面：AI 图片 · 韩系穿搭" })).toBeDisabled();
  });
});

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}
