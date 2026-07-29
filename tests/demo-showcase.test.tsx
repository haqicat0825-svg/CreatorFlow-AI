import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DemoPage from "@/app/demo/page";
import { DemoShowcase } from "@/components/demo-showcase";

describe("Demo Showcase", () => {
  it("renders the /demo page", () => {
    render(<DemoPage />);

    expect(screen.getByRole("heading", { level: 1, name: "韩系穿搭账号增长方案" })).toBeInTheDocument();
    expect(screen.getAllByText("演示案例").length).toBeGreaterThan(0);
    expect(screen.getByText(/不会写入工作台或触发任何真实任务/)).toBeInTheDocument();
  });

  it("shows the complete fixed Demo data", () => {
    render(<DemoShowcase />);

    ["Research Agent", "Trend Analysis Agent", "Writer Agent", "Visual Agent", "Draft Studio"].forEach(name => {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    });
    expect(screen.getByText("韩系穿搭")).toBeInTheDocument();
    expect(screen.getByText("12 个")).toBeInTheDocument();
    expect(screen.getByText("低饱和韩系通勤")).toBeInTheDocument();
    expect(screen.getByText("22–30 岁城市通勤女性，关注显高、质感与可复用搭配")).toBeInTheDocument();
    expect(screen.getAllByText("普通人也能照抄的韩系通勤公式").length).toBeGreaterThan(0);
    expect(screen.getByText("#韩系穿搭")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "韩系通勤 AI 封面示例图片" })).toBeInTheDocument();
    expect(screen.getByText("Seedream")).toBeInTheDocument();

    const draftSection = screen.getByRole("heading", { name: "Draft Studio" }).closest("section");
    expect(draftSection).not.toBeNull();
    expect(within(draftSection!).getByText("待审核")).toBeInTheDocument();
  });
});
