import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatorPage from "@/app/creator/page";

const successPayload = {
  success: true,
  data: {
    titles: Array.from({ length: 5 }, (_, index) => ({ id: `t-${index}`, title: `真实标题 ${index + 1}`, match: 95 - index })),
    body: "这是来自模型的正文内容，包含足够的信息供 Creator 页面编辑。",
    tags: ["#真实生成"],
    coverPrompt: "自然光杂志封面",
    safetyReport: { score: 100, checks: [] },
    metadata: { provider: "openai", model: "gpt-test" },
    isMock: false,
  },
};

const legacyBrief = {
  topic: "秋季穿搭",
  audiences: ["18-25岁女生"],
  styles: ["韩系甜美"],
  goal: "种草",
  useIntelligence: true,
};

beforeEach(() => {
  window.sessionStorage.clear();
  window.sessionStorage.setItem("creatorflow-task", JSON.stringify(legacyBrief));
  vi.restoreAllMocks();
});

describe("Creator API states", () => {
  it("renders a successful API result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(successPayload), { status: 200 })));
    render(<CreatorPage />);
    expect(await screen.findByDisplayValue("真实标题 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/这是来自模型的正文/)).toBeInTheDocument();
    expect(screen.getByText(/openai \/ gpt-test/)).toBeInTheDocument();
  });

  it("keeps the current brief and draft after a failed regeneration", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(successPayload), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { code: "TIMEOUT" } }), { status: 504 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CreatorPage />);
    const title = await screen.findByLabelText("标题");
    await user.clear(title);
    await user.type(title, "用户保留的标题");
    await user.click(screen.getByRole("button", { name: "重新生成" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("模型请求超时");
    expect(title).toHaveValue("用户保留的标题");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("passes only safe cover context to Visual Studio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(successPayload), { status: 200 })));
    const user = userEvent.setup();
    render(<CreatorPage />);
    await user.click(await screen.findByRole("link", { name: "前往 Visual Studio 生成封面" }));
    const stored = JSON.parse(window.sessionStorage.getItem("creatorflow-visual-task") ?? "{}");
    expect(stored.coverPrompt).toBe(successPayload.data.coverPrompt);
    expect(stored.taskId).toBeTruthy();
    expect(stored).not.toHaveProperty("apiKey");
    expect(stored).not.toHaveProperty("rag");
  });
});
