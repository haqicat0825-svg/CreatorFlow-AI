import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreatorPage from "@/app/creator/page";
import LibraryPage from "@/app/library/page";
import ModelsPage from "@/app/models/page";
import VisualStudioPage from "@/app/visual-studio/page";

const creatorResult = {
  success: true,
  data: {
    titles: [{ id: "title-1", title: "安全标题", match: 96 }],
    body: "安全正文",
    tags: ["#测试"],
    coverPrompt: "安全封面提示",
    safetyReport: { score: 98, checks: [], copyingRisk: { status: "passed" } },
    metadata: { provider: "deepseek", model: "deepseek-chat" },
    isMock: false,
    ragUsed: false,
    ragReferences: [],
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

describe("controlled UI recovery", () => {
  it("renders the Creator model region and all mobile tabs without client key fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(creatorResult), { status: 200 })));
    render(<CreatorPage />);
    expect(await screen.findByRole("complementary", { name: "文案生成模型" })).toBeInTheDocument();
    ["选题", "文案", "封面", "模型"].forEach(label => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
    expect(screen.queryByRole("textbox", { name: /API Key/i })).not.toBeInTheDocument();
  });

  it("renders the Visual Studio image model region without a client key field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      provider: "mock",
      model: "CreatorFlow Image Demo",
      mode: "mock",
      configured: true,
    }), { status: 200 })));
    render(<VisualStudioPage />);
    expect(await screen.findByRole("complementary", { name: "图片生成模型" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /API Key/i })).not.toBeInTheDocument();
  });

  it("keeps every Library category accessible with pressed state", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { enabled: false } }), { status: 200 })));
    render(<LibraryPage />);
    ["全部", "爆款案例", "我的风格", "标题公式", "视觉素材"].forEach(label => {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed");
    });
  });

  it("keeps Model Hub Local CLI and Cloud API accessible with pressed state", () => {
    render(<ModelsPage />);
    expect(screen.getByRole("button", { name: "本地 CLI" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Cloud API" })).toHaveAttribute("aria-pressed", "false");
  });
});
