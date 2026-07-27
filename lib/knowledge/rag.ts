import type { ContentTask } from "@/lib/types";
import { getKnowledgeRepository, type FileKnowledgeRepository } from "./repository";
import type { KnowledgeCategory, KnowledgeCitation, KnowledgeSearchResult } from "./types";

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
  const categoryPlans: { category: KnowledgeCategory; agent: string; limit: number }[] = [
    { category: "content_knowledge", agent: "Research Agent", limit: 4 },
    { category: "style_preference", agent: "Style Agent", limit: 3 },
    { category: "title_template", agent: "Writer Agent", limit: 4 },
  ];
  const resultGroups = await Promise.all(categoryPlans.map(async plan => ({
    ...plan,
    results: await repository.search(query, {
      tags: [...brief.audiences, ...brief.styles],
      categories: [plan.category],
      limit: plan.limit,
    }),
  })));
  const results = resultGroups.flatMap(group => group.results.map(result => ({ ...result, agent: group.agent })));
  const selected: (KnowledgeSearchResult & { agent: string })[] = [];
  const selectedIds = new Set<string>();
  for (const result of results) {
    if (result.score <= 0 || result.matchedTerms.length === 0 || selectedIds.has(result.item.id)) continue;
    try {
      const item = await repository.getById(result.item.id);
      if (
        item.deletedAt
        || item.qualityStatus !== "approved"
        || item.authenticityStatus === "disputed"
      ) continue;
      selected.push({ ...result, item });
      selectedIds.add(item.id);
    } catch {
      // A stale or unknown repository ID is never exposed as a formal citation.
    }
  }
  return {
    text: selected.map(({ item, agent }, index) => (
      `[${agent}｜来源 ${index + 1}｜${item.title}]\n分类：${item.category}\n标签：${item.tags.join("、") || "无"}\n${item.content.slice(0, 1600)}`
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
