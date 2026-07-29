import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DashboardLive } from "@/components/dashboard-live";
import { DASHBOARD_ACTIVITY_STORAGE_KEY } from "@/lib/dashboard/status";
import { DRAFT_STORAGE_KEY } from "@/lib/content/draft-storage";

beforeEach(() => {
  if (!window.localStorage) Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage() });
  if (!window.sessionStorage) Object.defineProperty(window, "sessionStorage", { configurable: true, value: memoryStorage() });
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("Dashboard operations center", () => {
  it("renders today's real workflow metrics, agent counts, and recent tasks", async () => {
    const now = new Date().toISOString();
    window.localStorage.setItem(DASHBOARD_ACTIVITY_STORAGE_KEY, JSON.stringify({
      schemaVersion: "1",
      generatedAt: now,
      discoveredCount: 7,
      analyzedCount: 4,
      topic: "韩系穿搭",
    }));
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      schemaVersion: "1",
      drafts: [
        {
          id: "draft-1",
          title: "低饱和通勤穿搭公开",
          content: "正文",
          tags: ["穿搭"],
          coverImage: "data:image/png;base64,one",
          images: ["data:image/png;base64,one", "data:image/png;base64,two"],
          imageSource: "generated",
          prompt: "prompt",
          model: "mock",
          status: "draft",
          publishStatus: "reviewing",
          platform: "xiaohongshu",
          createdAt: now,
        },
      ],
    }));

    render(<DashboardLive />);

    await waitFor(() => expect(screen.getByText("今日运营概览")).toBeInTheDocument());
    expect(screen.getByText("今日发现 7 个趋势")).toBeInTheDocument();
    expect(screen.getByText("已分析 4 个趋势")).toBeInTheDocument();
    expect(screen.getByText("今日生成 1 篇内容")).toBeInTheDocument();
    expect(screen.getByText("今日生成 2 张图片")).toBeInTheDocument();
    expect(screen.getByText("待审核 1 篇草稿")).toBeInTheDocument();
    expect(screen.getByText("低饱和通勤穿搭公开")).toBeInTheDocument();
    expect(screen.getAllByText("待审核", { selector: "span" }).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("演示案例完整流程")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看完整案例/ })).toHaveAttribute("href", "/demo");
  });

  it("shows the complete, visibly labeled Demo Case when no real data exists", async () => {
    render(<DashboardLive />);

    await waitFor(() => expect(screen.getAllByText("演示案例").length).toBeGreaterThan(0));
    expect(screen.getAllByText("韩系穿搭账号增长方案").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("演示案例完整流程")).toBeInTheDocument();
    expect(screen.getByText("搜索结果 28 条")).toBeInTheDocument();
    expect(screen.getByText("低饱和韩系通勤")).toBeInTheDocument();
    expect(screen.getByText("普通人也能照抄的韩系通勤公式")).toBeInTheDocument();
    expect(screen.getByText("AI 封面示例")).toBeInTheDocument();
    expect(screen.getAllByText("待审核", { selector: "span" }).length).toBeGreaterThan(0);
    expect(screen.getByText("今日发现 12 个趋势")).toBeInTheDocument();
    expect(screen.getByText("已分析 5 个趋势")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看完整案例/ })).toHaveAttribute("href", "/demo");
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
