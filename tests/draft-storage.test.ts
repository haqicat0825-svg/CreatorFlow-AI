import { beforeEach, describe, expect, it, vi } from "vitest";
import { DRAFT_STORAGE_KEY, loadDrafts, saveDraft, updateDraft } from "@/lib/content/draft-storage";

describe("Draft Studio storage", () => {
  let storage: Storage;

  beforeEach(() => {
    const values = new Map<string, string>();
    storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
      clear: () => values.clear(),
      key: index => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    };
    vi.stubGlobal("crypto", { randomUUID: () => "draft-1" });
  });

  it("stores the complete draft and reserved publishing fields", () => {
    saveDraft(storage, {
      title: " 秋日穿搭 ",
      content: "正文内容",
      tags: ["穿搭", "秋日"],
      coverImage: "https://example.com/cover.png",
      images: ["https://example.com/cover.png"],
      imageSource: "generated",
      model: "deepseek-chat",
    });

    expect(loadDrafts(storage)).toEqual([expect.objectContaining({
      id: "draft-1",
      title: "秋日穿搭",
      content: "正文内容",
      tags: ["穿搭", "秋日"],
      coverImage: "https://example.com/cover.png",
      imageSource: "generated",
      model: "deepseek-chat",
      status: "draft",
      publishStatus: "draft",
      platform: "xiaohongshu",
    })]);
  });

  it("ignores collections with an unknown schema", () => {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ schemaVersion: "2", drafts: [] }));
    expect(loadDrafts(storage)).toEqual([]);
  });

  it("updates editable and publishing fields without replacing the draft", () => {
    saveDraft(storage, {
      title: "原始标题",
      content: "原始正文",
      tags: ["原始"],
      coverImage: "",
      imageSource: "none",
      model: "deepseek-chat",
    });

    updateDraft(storage, "draft-1", {
      title: " 新标题 ",
      tags: ["新标签"],
      coverImage: "data:image/png;base64,cover",
      imageSource: "upload",
      publishStatus: "reviewing",
    });

    expect(loadDrafts(storage)[0]).toMatchObject({
      id: "draft-1",
      title: "新标题",
      tags: ["新标签"],
      coverImage: "data:image/png;base64,cover",
      images: ["data:image/png;base64,cover"],
      imageSource: "upload",
      publishStatus: "reviewing",
      platform: "xiaohongshu",
    });
  });

  it("loads legacy drafts that do not yet have an images array", () => {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      schemaVersion: "1",
      drafts: [{
        id: "legacy",
        title: "旧草稿",
        content: "正文",
        tags: [],
        coverImage: "https://example.com/legacy.png",
        imageSource: "library",
        model: "mock",
        status: "draft",
        publishStatus: "draft",
        platform: "xiaohongshu",
        createdAt: "2026-07-27T00:00:00.000Z",
      }],
    }));

    expect(loadDrafts(storage)[0].images).toEqual(["https://example.com/legacy.png"]);
  });
});
