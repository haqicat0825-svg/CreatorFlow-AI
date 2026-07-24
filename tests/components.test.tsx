import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/app-shell";

describe("CreatorFlow shell", () => {
  it("renders all five product destinations", () => {
    render(<AppShell><main>Current page</main></AppShell>);
    ["首页", "内容资产", "Agent 流程", "内容创作", "视觉工作室"].forEach((label) => {
      expect(screen.getAllByRole("link", { name: label })).toHaveLength(2);
    });
  });
});
