import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateTaskPage from "@/app/create-task/page";
import {
  CREATOR_TASK_STORAGE_KEY,
  PENDING_TREND_SELECTION_STORAGE_KEY,
} from "@/lib/content/task-envelope";
import { validTrendContext } from "./fixtures/trend-context";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

beforeEach(() => {
  window.sessionStorage.clear();
  pushMock.mockClear();
});

describe("Content Brief", () => {
  it("validates a missing topic", async () => {
    const user = userEvent.setup();
    render(<CreateTaskPage />);
    await user.clear(screen.getByLabelText("内容主题"));
    await user.click(screen.getByRole("button", { name: "开始生成" }));
    expect(screen.getByText("请输入内容主题")).toBeInTheDocument();
  });

  it("supports selecting audience and style tags", async () => {
    const user = userEvent.setup();
    render(<CreateTaskPage />);
    const audience = screen.getByRole("button", { name: "学生党" });
    const style = screen.getByRole("button", { name: "高级感" });
    await user.click(audience);
    await user.click(style);
    expect(audience).toHaveAttribute("aria-pressed", "true");
    expect(style).toHaveAttribute("aria-pressed", "true");
  });

  it("completes a pending trend selection without inventing a user profile", async () => {
    window.sessionStorage.setItem(
      PENDING_TREND_SELECTION_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "1",
        topic: "Three layering formulas",
        trendContext: validTrendContext,
      }),
    );
    const user = userEvent.setup();
    render(<CreateTaskPage />);

    expect(await screen.findByDisplayValue("Three layering formulas")).toBeInTheDocument();
    const audience = screen.getByRole("button", { name: "学生党" });
    const style = screen.getByRole("button", { name: "高级感" });
    expect(audience).toHaveAttribute("aria-pressed", "false");
    expect(style).toHaveAttribute("aria-pressed", "false");

    await user.click(audience);
    await user.click(style);
    await user.click(screen.getByRole("button", { name: "开始生成" }));

    expect(JSON.parse(
      window.sessionStorage.getItem(CREATOR_TASK_STORAGE_KEY) ?? "{}",
    )).toMatchObject({
      schemaVersion: "1",
      brief: {
        topic: "Three layering formulas",
        audiences: ["学生党"],
        styles: ["高级感"],
      },
      trendContext: validTrendContext,
    });
    expect(
      window.sessionStorage.getItem(PENDING_TREND_SELECTION_STORAGE_KEY),
    ).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/creator");
  });
});
