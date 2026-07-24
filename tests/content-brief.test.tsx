import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CreateTaskPage from "@/app/create-task/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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
});
