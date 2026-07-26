import { NextResponse } from "next/server";
import { createTrendAnalysisAdapter } from "@/lib/analysis/factory";
import type { TrendAnalysisResult } from "@/lib/analysis/types";
import { validateTrendAnalysisCore } from "@/lib/analysis/validation";
import { ModelAdapterError } from "@/lib/providers/types";
import { validateSearchResult } from "@/lib/research/normalizer";
import type { SearchResult } from "@/lib/research/types";

export const runtime = "nodejs";

const ANALYSIS_LIMITS = {
  maxQueryLength: 200,
  maxContextLength: 4_000,
  maxSelectedResults: 10,
  maxInputLength: 60_000,
} as const;

type TrendResearchMaterial = SearchResult;

class TrendAnalysisApiError extends Error {
  constructor(
    readonly code:
      | "INVALID_REQUEST"
      | "INSUFFICIENT_EVIDENCE"
      | "INPUT_TOO_LARGE",
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TrendAnalysisApiError";
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const { selectedResults } = validateAnalyzeRequest(body);
    const adapter = createTrendAnalysisAdapter();
    const result = await adapter.analyze(selectedResults);
    validateAnalysisResult(result, selectedResults);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const normalized = normalizeError(error);
    return NextResponse.json(
      { success: false, error: { code: normalized.code, message: normalized.message } },
      { status: normalized.status },
    );
  }
}

function validateAnalyzeRequest(input: unknown): {
  query: string;
  selectedResults: TrendResearchMaterial[];
  context?: string;
} {
  if (!isRecord(input)) invalid("请求正文必须是 JSON 对象。");
  const allowed = new Set(["query", "selectedResults", "context"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    invalid("请求包含不支持的字段。");
  }

  const query = normalizedString(input.query);
  if (!query) invalid("query 不能为空。");
  if (query.length > ANALYSIS_LIMITS.maxQueryLength) tooLarge("query 超出长度限制。");

  if (input.context !== undefined && typeof input.context !== "string") {
    invalid("context 必须是字符串。");
  }
  const context = typeof input.context === "string" ? input.context.normalize("NFKC").trim() : undefined;
  if (context && context.length > ANALYSIS_LIMITS.maxContextLength) {
    tooLarge("context 超出长度限制。");
  }

  if (!Array.isArray(input.selectedResults)) invalid("selectedResults 必须是数组。");
  if (input.selectedResults.length === 0) {
    throw new TrendAnalysisApiError("INSUFFICIENT_EVIDENCE", "至少需要一条研究证据。", 422);
  }
  if (input.selectedResults.length > ANALYSIS_LIMITS.maxSelectedResults) {
    tooLarge(`selectedResults 最多允许 ${ANALYSIS_LIMITS.maxSelectedResults} 条。`);
  }
  if (JSON.stringify(input).length > ANALYSIS_LIMITS.maxInputLength) {
    tooLarge("分析输入超出总长度限制。");
  }

  let selectedResults: TrendResearchMaterial[];
  try {
    selectedResults = input.selectedResults.map(mapTrendResearchMaterial);
  } catch {
    invalid("selectedResults 包含非法证据。");
  }
  if (new Set(selectedResults.map(({ id }) => id)).size !== selectedResults.length) {
    invalid("selectedResults 的证据 id 必须唯一。");
  }
  return { query, selectedResults, ...(context ? { context } : {}) };
}

function mapTrendResearchMaterial(input: unknown): TrendResearchMaterial {
  if (!isRecord(input)) invalid("证据必须是对象。");
  for (const key of ["id", "title", "summary", "sourceUrl", "retrievedAt"]) {
    if (typeof input[key] === "string" && input[key].length > ANALYSIS_LIMITS.maxInputLength) {
      tooLarge("单条证据字段超出长度限制。");
    }
  }
  return validateSearchResult(input);
}

function validateAnalysisResult(result: TrendAnalysisResult, evidence: TrendResearchMaterial[]) {
  const { sourceReferences, metadata, ...core } = result;
  validateTrendAnalysisCore(core, evidence);
  const expectedReferences = evidence.map(({ id: resultId, title, sourceUrl }) => ({ resultId, title, sourceUrl }));
  if (
    !Array.isArray(sourceReferences)
    || JSON.stringify(sourceReferences) !== JSON.stringify(expectedReferences)
    || !isRecord(metadata)
    || !["mock", "deepseek"].includes(String(metadata.provider))
    || typeof metadata.model !== "string"
    || typeof metadata.generatedAt !== "string"
    || metadata.inputResultCount !== evidence.length
    || metadata.schemaVersion !== "1"
    || typeof metadata.isMock !== "boolean"
  ) {
    throw new ModelAdapterError("SCHEMA_MISMATCH", "Trend analysis response failed validation.", 502);
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    invalid("请求正文不是有效 JSON。");
  }
}

function normalizeError(error: unknown) {
  if (error instanceof TrendAnalysisApiError) return error;
  if (error instanceof ModelAdapterError) {
    const supported = new Set(["CONFIGURATION_MISSING", "TIMEOUT", "RATE_LIMITED", "UPSTREAM_ERROR"]);
    const code = supported.has(error.code) ? error.code : "UPSTREAM_ERROR";
    const status = code === "CONFIGURATION_MISSING"
      ? 503
      : code === "TIMEOUT"
        ? 504
        : code === "RATE_LIMITED"
          ? 429
          : 502;
    return { code, status, message: safeUpstreamMessage(code) };
  }
  return { code: "UPSTREAM_ERROR", status: 502, message: "趋势分析服务暂时不可用。" };
}

function safeUpstreamMessage(code: string) {
  if (code === "CONFIGURATION_MISSING") return "服务端趋势分析配置不完整。";
  if (code === "TIMEOUT") return "趋势分析请求超时，请稍后重试。";
  if (code === "RATE_LIMITED") return "趋势分析请求过于频繁，请稍后重试。";
  return "上游趋势分析服务暂时不可用。";
}

function normalizedString(value: unknown) {
  return typeof value === "string" ? value.normalize("NFKC").trim() : "";
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

function invalid(message: string): never {
  throw new TrendAnalysisApiError("INVALID_REQUEST", message, 400);
}

function tooLarge(message: string): never {
  throw new TrendAnalysisApiError("INPUT_TOO_LARGE", message, 413);
}
