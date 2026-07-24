import { describe, expect, it, vi } from "vitest";
import { buildRagContext } from "@/lib/knowledge/rag";
import type { KnowledgeItem } from "@/lib/knowledge/types";

const item: KnowledgeItem = {
  id: "knowledge-1",
  title: "高质量标题公式",
  content: "标题应包含明确场景和可执行收益。",
  sourceType: "article",
  sourceUrl: "https://example.com/reference",
  author: "编辑部",
  tags: ["标题", "韩系"],
  contentType: "title-formula",
  createdAt: "2026-07-24T00:00:00.000Z",
  updatedAt: "2026-07-24T00:00:00.000Z",
  qualityStatus: "approved",
  authenticityStatus: "verified",
};

const brief = {
  topic: "韩系穿搭",
  audiences: ["职场女性"],
  styles: ["韩系"],
  goal: "种草" as const,
  useIntelligence: true,
};

describe("RAG context", () => {
  it("uses only a repository-backed ID and reports the actual match reason", async () => {
    const search = vi.fn().mockResolvedValue([{ item, score: 10, matchedTerms: ["韩系"] }]);
    const getById = vi.fn().mockResolvedValue(item);
    const rag = await buildRagContext(brief, { search, getById });
    expect(rag.text).toContain(item.title);
    expect(rag.sources).toEqual([expect.objectContaining({
      id: item.id,
      sourceUrl: item.sourceUrl,
      matchedReason: expect.stringContaining("韩系"),
      isMock: false,
    })]);
    expect(getById).toHaveBeenCalledWith(item.id);
  });

  it("returns no references when retrieval is disabled", async () => {
    const search = vi.fn();
    const getById = vi.fn();
    expect(await buildRagContext({ ...brief, useIntelligence: false }, { search, getById })).toEqual({
      text: "",
      sources: [],
      materials: [],
    });
    expect(search).not.toHaveBeenCalled();
  });

  it("excludes unknown IDs, mock drafts, deleted items, and low-quality items", async () => {
    const candidates: KnowledgeItem[] = [
      { ...item, id: "missing" },
      {
        ...item,
        id: "mock-draft",
        qualityStatus: "draft",
        research: {
          platform: "xiaohongshu",
          researchQuery: "test",
          retrievedAt: item.createdAt,
          isMock: true,
        },
      },
      { ...item, id: "deleted", deletedAt: item.updatedAt },
      { ...item, id: "rejected", qualityStatus: "rejected" },
    ];
    const search = vi.fn().mockResolvedValue(candidates.map(candidate => ({
      item: candidate,
      score: 10,
      matchedTerms: ["韩系"],
    })));
    const getById = vi.fn(async (id: string) => {
      if (id === "missing") throw new Error("not found");
      return candidates.find(candidate => candidate.id === id);
    });
    const rag = await buildRagContext(brief, { search, getById });
    expect(rag.sources).toEqual([]);
    expect(rag.materials).toEqual([]);
  });
});
