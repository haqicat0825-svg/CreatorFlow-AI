import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModelsPage from "@/app/models/page";

describe("Model Hub", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, provider: "mock", model: "demo", latency: 2 }), { status: 200 })));
  });

  it("switches text model mode and tests the server connection", async () => {
    const user = userEvent.setup();
    render(<ModelsPage />);
    await user.click(screen.getByRole("button", { name: "Cloud API" }));
    expect(screen.getByText("Cloud endpoint")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "测试连接" })[0]);
    expect(await screen.findByText("Connected")).toBeInTheDocument();
  });
});
