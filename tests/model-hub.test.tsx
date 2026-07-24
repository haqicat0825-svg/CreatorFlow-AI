import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ModelsPage from "@/app/models/page";

describe("Model Hub", () => {
  it("switches text model mode and simulates a connection", async () => {
    const user = userEvent.setup();
    render(<ModelsPage />);
    await user.click(screen.getByRole("button", { name: "Cloud API" }));
    expect(screen.getByText("Cloud endpoint")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "测试连接" })[0]);
    expect(await screen.findByText("Connected")).toBeInTheDocument();
  });
});
