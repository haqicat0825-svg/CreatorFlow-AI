import type { ContentTask } from "@/lib/types";
import { getKnowledgeRepository, type FileKnowledgeRepository } from "./repository";
import type { KnowledgeCitation, KnowledgeSearchResult } from "./types";

export type RagContext = {
  text: string;
  sources: KnowledgeCitation[];
  materials: { title: string; content: string }[];
};

export async function buildRagContext(
  brief: ContentTask,
  repository: Pick<FileKnowledgeRepository, "search" | "getById"> = getKnowledgeRepository(),
): Promise<RagContext> {
  if (!brief.useIntelligence) return { text: "", sources: [], materials: [] };
  const query = [brief.topic, ...brief.audiences, ...brief.styles, brief.goal].join(" ");
  const results = await repository.search(query, { tags: [...brief.audiences, ...brief.styles], limit: 5 });
  const selected: KnowledgeSearchResult[] = [];
  for (const result of results) {
    if (result.score <= 0 || result.matchedTerms.length === 0) continue;
    try {
      const item = await repository.getById(result.item.id);
      if (
        item.deletedAt
        || item.qualityStatus !== "approved"
        || item.authenticityStatus === "disputed"
      ) continue;
      selected.push({ ...result, item });
    } catch {
      // A stale or unknown repository ID is never exposed as a formal citation.
    }
  }
  return {
    text: selected.map(({ item }, index) => (
      `[来源 ${index + 1}｜${item.title}]\n标签：${item.tags.join("、") || "无"}\n${item.content.slice(0, 1600)}`
    )).join("\n\n"),
    sources: selected.map(({ item, matchedTerms }) => ({
      id: item.id,
      title: item.title,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      matchedReason: `匹配关键词：${matchedTerms.join("、")}`,
      isMock: item.research?.isMock === true,
    })),
    materials: selected.map(({ item }) => ({ title: item.title, content: item.content })),
  };
}
