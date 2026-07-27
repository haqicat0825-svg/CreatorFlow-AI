import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Dashboard from "@/app/page";
import { ResearchLibrary } from "@/components/research-library";

describe("Research Beta product copy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("positions Research Beta as non-blocking on the dashboard", () => {
    render(<Dashboard />);

    expect(screen.getByText("Research Beta 支持受控的只读 CLI 搜索；该能力不影响 CreatorFlow MVP 核心内容生产流程。")).toBeInTheDocument();
    expect(screen.queryByText(/真实小红书搜索尚未接入/)).not.toBeInTheDocument();
  });

  it("describes an available authenticated CLI as an opt-in beta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        available: true,
        loggedIn: true,
        provider: "xiaohongshu-cli",
        safeMessage: "只读 CLI 可用。",
      },
    }))));

    render(<ResearchLibrary />);

    expect(await screen.findByText("Xiaohongshu CLI 已连接：真实只读搜索，结果需人工确认后保存。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Research Beta" })).toBeInTheDocument();
  });

  it("labels fallback data as Demo/Mock rather than real platform data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        available: false,
        loggedIn: false,
        provider: "mock",
        safeMessage: "CLI 不可用。",
      },
    }))));

    render(<ResearchLibrary />);

    expect(await screen.findByText("Xiaohongshu CLI 当前未连接；搜索可能回退为明确标识的 Demo/Mock。")).toBeInTheDocument();
  });

  it("renders a complete Xiaohongshu content asset card", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith("/api/research/status")) {
        return new Response(JSON.stringify({
          success: true,
          data: { available: true, loggedIn: true, provider: "xiaohongshu-cli", safeMessage: "只读 CLI 可用。" },
        }));
      }
      return new Response(JSON.stringify({
        success: true,
        data: [{
          id: "note-1",
          title: "韩系通勤穿搭",
          summary: "适合通勤场景的韩系搭配。",
          author: "穿搭作者",
          coverImage: "https://sns-img.example.com/cover.jpg",
          images: ["https://sns-img.example.com/cover.jpg"],
          likes: 1234,
          saves: 88,
          comments: 12,
          url: "https://www.xiaohongshu.com/explore/note-1",
          sourceUrl: "https://www.xiaohongshu.com/explore/note-1",
          tags: ["韩系"],
          source: "xiaohongshu",
          retrievedAt: "2026-07-27T00:00:00.000Z",
          isMock: false,
        }],
      }));
    }));

    render(<ResearchLibrary />);
    fireEvent.change(screen.getByPlaceholderText("输入关键词后手动搜索"), { target: { value: "韩系" } });
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));

    expect(await screen.findByRole("img", { name: "韩系通勤穿搭封面" })).toHaveAttribute(
      "src",
      "https://sns-img.example.com/cover.jpg",
    );
    expect(screen.getByText("作者：穿搭作者")).toBeInTheDocument();
    expect(screen.getByText("点赞 1,234")).toBeInTheDocument();
    expect(screen.getByText("收藏 88")).toBeInTheDocument();
    expect(screen.getByText("来源：小红书")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "加入爆款案例库" })).toBeInTheDocument();
  });
});
