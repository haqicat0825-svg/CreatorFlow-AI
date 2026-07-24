import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "@/app/page";
import { ResearchLibrary } from "@/components/research-library";

describe("Research Beta product copy", () => {
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

    expect(await screen.findByText("Beta：当前可以主动使用真实只读 CLI 搜索，结果需要人工确认后才能入库。")).toBeInTheDocument();
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

    expect(await screen.findByText("Beta：真实搜索当前不可用，已明确回退为 Demo/Mock，不代表真实平台数据。")).toBeInTheDocument();
  });
});
