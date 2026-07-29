import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductThinkingPage from "@/app/product-thinking/page";
import { ProductThinking } from "@/components/product-thinking";

describe("Product Thinking page", () => {
  it("renders the /product-thinking page and required product narrative", () => {
    render(<ProductThinkingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "CreatorFlow AI 产品思考" })).toBeInTheDocument();
    ["用户痛点", "产品定位", "Agent 架构", "产品原则", "当前能力", "未来规划"].forEach(title => {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    });
    expect(screen.getByText("AI 内容运营工作流")).toBeInTheDocument();
  });

  it("shows the Agent architecture and human review boundary", () => {
    render(<ProductThinking />);

    ["Research Agent", "Trend Analysis Agent", "Writer Agent", "Visual Agent", "Human Review"].forEach(agent => {
      expect(screen.getByRole("heading", { name: agent })).toBeInTheDocument();
    });
    expect(screen.getByText("Human-in-the-loop")).toBeInTheDocument();
    expect(screen.getByText("AI 辅助决策，而不是完全替代人工。")).toBeInTheDocument();

    const roadmap = screen.getByRole("heading", { name: "未来规划" }).closest(".panel");
    expect(roadmap).not.toBeNull();
    expect(within(roadmap!).getByText("以上为产品路线规划，不代表当前版本已经具备。")).toBeInTheDocument();
  });
});
