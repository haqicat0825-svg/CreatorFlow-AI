import { getKnowledgeRepository, KnowledgeRepositoryError, type FileKnowledgeRepository } from "@/lib/knowledge/repository";
import { validateSearchResult } from "./normalizer";

type ImportRequest = {
  query: unknown;
  selected: unknown;
  userTags?: unknown;
};

export async function importSelectedResearch(
  input: ImportRequest,
  repository: Pick<FileKnowledgeRepository, "create"> = getKnowledgeRepository(),
) {
  if (typeof input.query !== "string" || !input.query.trim() || input.query.length > 80) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "检索关键词无效。");
  }
  if (!Array.isArray(input.selected) || input.selected.length === 0 || input.selected.length > 10) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "请明确选择 1-10 条搜索结果。");
  }
  const userTags = Array.isArray(input.userTags)
    ? input.userTags.filter((tag): tag is string => typeof tag === "string").map(tag => tag.trim()).filter(Boolean).slice(0, 10)
    : [];
  const results = [];
  for (const raw of input.selected) {
    const item = validateSearchResult(raw);
    try {
      const created = await repository.create({
        title: item.title,
        content: item.summary,
        sourceType: "article",
        sourceUrl: item.sourceUrl,
        author: item.author,
        publishedAt: item.publishedAt,
        tags: [...new Set([...item.tags, ...userTags, input.query.trim(), "小红书研究"])].slice(0, 20),
        contentType: "reference",
        qualityStatus: item.isMock ? "draft" : "approved",
        authenticityStatus: item.isMock ? "unverified" : "verified",
        research: {
          platform: item.source,
          researchQuery: input.query.trim(),
          retrievedAt: item.retrievedAt,
          isMock: item.isMock,
          metrics: item.metrics,
        },
      });
      results.push({ searchResultId: item.id, status: "imported" as const, knowledgeId: created.id });
    } catch (error) {
      if (error instanceof KnowledgeRepositoryError && error.code === "DUPLICATE") {
        results.push({ searchResultId: item.id, status: "duplicate" as const });
        continue;
      }
      results.push({ searchResultId: item.id, status: "failed" as const });
    }
  }
  return {
    results,
    importedIds: results
      .filter((result): result is typeof result & { status: "imported"; knowledgeId: string } => result.status === "imported")
      .map(result => result.knowledgeId),
    duplicateIds: results
      .filter(result => result.status === "duplicate")
      .map(result => result.searchResultId),
    storageConfirmed: results.length > 0 && results.every(result => result.status !== "failed"),
    repositoryPath: "knowledge.json",
  };
}
