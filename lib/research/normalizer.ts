import { RESEARCH_CONFIG, type SearchResult } from "./types";
import { ResearchError } from "./errors";

const forbiddenShellCharacters = /[;&|`$<>\\]/u;
const controlCharacters = /[\u0000-\u001f\u007f-\u009f]/gu;

export function validateSearchRequest(input: unknown) {
  if (!input || typeof input !== "object") throw new ResearchError("INVALID_REQUEST", "搜索请求无效。");
  const candidate = input as Record<string, unknown>;
  const sortModes = ["general", "popular", "latest"] as const;
  const contentTypes = ["all", "video", "image"] as const;
  if (candidate.sortMode !== undefined && !sortModes.includes(candidate.sortMode as typeof sortModes[number])) {
    throw new ResearchError("INVALID_REQUEST", "排序方式无效。");
  }
  if (candidate.contentType !== undefined && !contentTypes.includes(candidate.contentType as typeof contentTypes[number])) {
    throw new ResearchError("INVALID_REQUEST", "内容类型无效。");
  }
  if (typeof candidate.query !== "string") throw new ResearchError("INVALID_REQUEST", "请输入搜索关键词。");
  const query = candidate.query.normalize("NFKC").replace(controlCharacters, "").trim();
  if (!query || query.length > RESEARCH_CONFIG.maxQueryLength) {
    throw new ResearchError("INVALID_REQUEST", `关键词长度须为 1-${RESEARCH_CONFIG.maxQueryLength} 个字符。`);
  }
  if (forbiddenShellCharacters.test(query) || !/^[\p{L}\p{N}\p{Zs}#@._+\-，。！？、（）()：:]+$/u.test(query)) {
    throw new ResearchError("INVALID_REQUEST", "关键词包含不支持的字符。");
  }
  const limit = typeof candidate.limit === "number" && Number.isInteger(candidate.limit)
    ? candidate.limit
    : RESEARCH_CONFIG.maxResults;
  if (limit < 1 || limit > RESEARCH_CONFIG.maxResults) {
    throw new ResearchError("INVALID_REQUEST", `单次最多返回 ${RESEARCH_CONFIG.maxResults} 条结果。`);
  }
  return {
    query,
    limit,
    sortMode: (candidate.sortMode as typeof sortModes[number] | undefined) ?? "general",
    contentType: (candidate.contentType as typeof contentTypes[number] | undefined) ?? "all",
  };
}

export function validateSearchResult(input: unknown): SearchResult {
  if (!input || typeof input !== "object") throw new ResearchError("INVALID_RESPONSE", "搜索结果格式无效。", 502);
  const value = input as Record<string, unknown>;
  const required = ["id", "title", "summary", "sourceUrl", "retrievedAt"];
  if (required.some(key => typeof value[key] !== "string" || !(value[key] as string).trim())) {
    throw new ResearchError("INVALID_RESPONSE", "搜索结果缺少必要字段。", 502);
  }
  let sourceUrl: string;
  try {
    const parsed = new URL(value.sourceUrl as string);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    sourceUrl = parsed.toString();
  } catch {
    throw new ResearchError("INVALID_RESPONSE", "搜索结果链接无效。", 502);
  }
  const metrics = value.metrics && typeof value.metrics === "object"
    ? Object.fromEntries(Object.entries(value.metrics).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])))
    : undefined;
  const coverImage = optionalHttpUrl(value.coverImage);
  const images = Array.isArray(value.images)
    ? [...new Set(value.images.map(optionalHttpUrl).filter((image): image is string => Boolean(image)))].slice(0, 20)
    : undefined;
  const likes = optionalMetric(value.likes);
  const saves = optionalMetric(value.saves);
  const comments = optionalMetric(value.comments);
  if (!["xiaohongshu", "tavily"].includes(String(value.source))) {
    throw new ResearchError("INVALID_RESPONSE", "搜索结果来源无效。", 502);
  }
  return {
    id: String(value.id).slice(0, 200),
    title: String(value.title).trim().slice(0, 200),
    summary: String(value.summary).trim().slice(0, 10_000),
    author: typeof value.author === "string" ? value.author.trim().slice(0, 100) || undefined : undefined,
    coverImage,
    images: images?.length ? images : undefined,
    likes,
    saves,
    comments,
    url: sourceUrl,
    publishedAt: typeof value.publishedAt === "string" ? value.publishedAt : undefined,
    sourceUrl,
    thumbnailUrl: coverImage ?? optionalHttpUrl(value.thumbnailUrl),
    metrics: metrics && Object.keys(metrics).length ? metrics : undefined,
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 20) : [],
    source: value.source as SearchResult["source"],
    retrievedAt: String(value.retrievedAt),
    isMock: value.isMock === true,
  };
}

function optionalHttpUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function optionalMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}
