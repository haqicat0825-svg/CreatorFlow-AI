import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VisualStudioPage from "@/app/visual-studio/page";

const modelCheck = {
  success: true,
  provider: "mock",
  model: "CreatorFlow Image Demo",
  mode: "mock",
  configured: true,
  check: "MOCK_READY",
};
const imageResult = {
  success: true,
  data: {
    images: [
      { id: "image-1", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E", width: 1024, height: 1536, mimeType: "image/svg+xml" },
      { id: "image-2", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E", width: 1024, height: 1536, mimeType: "image/svg+xml" },
    ],
    provider: "mock",
    model: "CreatorFlow Image Demo",
    isMock: true,
    safetyWarnings: [],
    generationId: "generation-1",
  },
};

beforeEach(() => {
  if (!window.localStorage) Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage() });
  if (!window.sessionStorage) Object.defineProperty(window, "sessionStorage", { configurable: true, value: memoryStorage() });
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
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

describe("Visual Studio image flow", () => {
  it("receives the Creator cover prompt and keeps edited prompt and candidates after failure", async () => {
    window.sessionStorage.setItem("creatorflow-visual-task", JSON.stringify({
      taskId: "task-1",
      coverPrompt: "来自 Creator 的封面 Prompt",
      style: ["自然"],
      audience: ["新手"],
      contentGoal: "种草",
    }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(modelCheck), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(imageResult), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { code: "TIMEOUT" } }), { status: 504 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<VisualStudioPage />);

    const prompt = await screen.findByLabelText("封面 Prompt");
    expect(prompt).toHaveValue("来自 Creator 的封面 Prompt");
    await user.clear(prompt);
    await user.type(prompt, "用户编辑后的 Prompt");
    await user.click(screen.getByRole("button", { name: "生成 4 张" }));
    expect(await screen.findAllByAltText("AI 生成的封面候选")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "生成 4 张" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Prompt 和已有候选已保留");
    expect(prompt).toHaveValue("用户编辑后的 Prompt");
    expect(screen.getAllByAltText("AI 生成的封面候选")).toHaveLength(2);
  });

  it("selects a successful candidate as cover", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(modelCheck), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(imageResult), { status: 200 })));
    const user = userEvent.setup();
    render(<VisualStudioPage />);
    await user.click(screen.getByRole("button", { name: "生成 4 张" }));
    const second = await screen.findByRole("button", { name: "候选封面 image-2" });
    await user.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "设为封面" }));
    await waitFor(() => expect(screen.getByText("已设为封面")).toBeInTheDocument());
  });
});
