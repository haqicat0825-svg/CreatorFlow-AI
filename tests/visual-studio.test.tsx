import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VisualStudioPage from "@/app/visual-studio/page";

const modelCheck = {
  success: true,
  provider: "volcengine-jimeng",
  model: "doubao-seedream-5-0-pro-260628",
  mode: "cloud",
  configured: true,
};
const result = {
  images: [
    { id: "image-1", url: "https://example.com/one.png", width: 1024, height: 1536, mimeType: "image/png" },
  ],
  provider: "volcengine-jimeng",
  model: "doubao-seedream-5-0-pro-260628",
  isMock: false,
  safetyWarnings: [],
  generationId: "generation-1",
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

describe("Visual Studio asynchronous image flow", () => {
  it("creates a task and renders only server-reported progress steps", async () => {
    let statusChecks = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/models/test") return json(modelCheck);
      if (url === "/api/generate/image/status" && !init?.method) return json({}, 404);
      if (url === "/api/generate/image") return json({ taskId: "task-1", status: "processing" }, 202);
      if (url.includes("/api/generate/image/status?id=task-1")) {
        statusChecks += 1;
        return statusChecks === 1
          ? json({ success: true, data: task("processing", "calling_model") })
          : json({ success: true, data: { ...task("completed", "completed"), result, libraryItemIds: ["library-1"] } });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<VisualStudioPage />);

    await user.selectOptions(await screen.findByLabelText("候选"), "1");
    await user.click(screen.getByRole("button", { name: "生成 1 张" }));

    expect(screen.getByText("AI 正在生成封面，预计需要 1-2 分钟")).toBeInTheDocument();
    ["分析穿搭主题", "构建视觉 Prompt", "调用 Seedream 模型", "生成封面图片", "保存到图片库"]
      .forEach(label => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByText("调用 Seedream 模型").parentElement).toHaveTextContent("•");

    expect(await screen.findByAltText("AI 生成的封面候选", {}, { timeout: 3_000 })).toBeInTheDocument();
    expect(screen.getByText("生成结果已自动保存到 AI 图片库。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "设为封面" }));
    expect(JSON.parse(window.localStorage.getItem("creatorflow-selected-cover") ?? "{}")).toMatchObject({
      imageUrl: "https://example.com/one.png",
      source: "generated",
      imageId: "image-1",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/generate/image", expect.objectContaining({ method: "POST" }));
  });

  it("restores a processing task after re-entering Visual Studio", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/models/test") return json(modelCheck);
      if (url === "/api/generate/image/status") {
        return json({ success: true, data: task("processing", "saving_library") });
      }
      if (url.includes("/api/generate/image/status?id=task-1")) {
        return json({ success: true, data: task("processing", "saving_library") });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<VisualStudioPage />);

    expect(await screen.findByText("AI 正在生成封面，预计需要 1-2 分钟")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("保存到图片库").parentElement).toHaveTextContent("•"));
  });

  it("shows distinct timeout and provider failure messages", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/models/test") return json(modelCheck);
      if (url === "/api/generate/image/status") {
        return json({
          success: true,
          data: {
            ...task("completed", "calling_model"),
            status: "failed",
            error: { code: "IMAGE_PROVIDER_TIMEOUT", message: "图片模型响应时间较长，请稍后重试" },
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<VisualStudioPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("图片模型响应时间较长，请稍后重试");
    expect(screen.queryByText("图片服务暂时不可用")).not.toBeInTheDocument();
  });
});

function task(status: "processing" | "completed", step: string) {
  return {
    id: "task-1",
    status,
    step,
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:01.000Z",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
