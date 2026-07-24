import type { ContentTask, SafetyReport } from "@/lib/types";
import {
  ModelAdapterError,
  type GeneratedContent,
  type TextResponseDiagnostics,
} from "@/lib/providers/types";

const GOALS = new Set(["涨粉", "种草", "品牌推广"]);

export function parseContentBrief(value: unknown): ContentTask {
  if (!value || typeof value !== "object") throw new Error("请求正文必须是对象。");
  const input = value as Record<string, unknown>;
  if (typeof input.topic !== "string" || !input.topic.trim() || input.topic.length > 200) {
    throw new Error("内容主题不能为空，且不能超过 200 个字符。");
  }
  const audiences = parseStringArray(input.audiences, "目标用户", 10);
  const styles = parseStringArray(input.styles, "内容风格", 10);
  if (typeof input.goal !== "string" || !GOALS.has(input.goal)) throw new Error("内容目标无效。");
  if (typeof input.useIntelligence !== "boolean") throw new Error("内容智能选项无效。");
  return {
    topic: input.topic.trim(),
    audiences,
    styles,
    goal: input.goal as ContentTask["goal"],
    useIntelligence: input.useIntelligence,
  };
}

function parseStringArray(value: unknown, label: string, max: number) {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) {
    throw new Error(`${label}必须包含 1-${max} 项。`);
  }
  if (value.some(item => typeof item !== "string" || !item.trim() || item.length > 60)) {
    throw new Error(`${label}包含无效内容。`);
  }
  return value.map(item => item.trim());
}

type ModelPayload = Pick<GeneratedContent, "titles" | "body" | "tags" | "coverPrompt"> & {
  safetyReport: SafetyReport;
};

export function parseModelContent(raw: unknown): ModelPayload {
  const upstreamDiagnostics = extractDiagnostics(raw);
  let value = isTextEnvelope(raw) ? raw.content : raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) throw contractError("EMPTY_RESPONSE", "$", "模型内容为空。", upstreamDiagnostics);
    const jsonText = stripSingleJsonFence(trimmed);
    try {
      value = JSON.parse(jsonText);
    } catch {
      throw contractError(
        looksTruncated(jsonText) ? "TRUNCATED_RESPONSE" : "INVALID_JSON",
        "$",
        looksTruncated(jsonText) ? "JSON 似乎被截断。" : "内容不是有效 JSON。",
        upstreamDiagnostics,
      );
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw contractError("SCHEMA_MISMATCH", "$", "根节点必须是 JSON 对象。", upstreamDiagnostics);
  }
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.titles)) {
    throw contractError("SCHEMA_MISMATCH", "titles", "必须是数组，单个字符串不能代替标题数组。", upstreamDiagnostics);
  }
  if (input.titles.length !== 5) {
    throw contractError("SCHEMA_MISMATCH", "titles", "必须恰好包含 5 个标题。", upstreamDiagnostics);
  }
  const titles = input.titles.map((candidate, index) => parseTitle(candidate, index, upstreamDiagnostics));
  if (typeof input.body !== "string" || !input.body.trim()) {
    throw contractError("SCHEMA_MISMATCH", "body", "正文必须是非空字符串。", upstreamDiagnostics);
  }
  const tags = normalizeTags(input.tags, upstreamDiagnostics);
  if (typeof input.coverPrompt !== "string" || !input.coverPrompt.trim()) {
    throw contractError("SCHEMA_MISMATCH", "coverPrompt", "封面 Prompt 必须是非空字符串。", upstreamDiagnostics);
  }
  const safetyReport = parseSafetyReport(input.safetyReport, upstreamDiagnostics);
  return {
    titles,
    body: input.body.trim(),
    tags,
    coverPrompt: input.coverPrompt.trim(),
    safetyReport,
  };
}

function parseTitle(candidate: unknown, index: number, diagnostics?: TextResponseDiagnostics) {
  const path = `titles[${index}]`;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw contractError("SCHEMA_MISMATCH", path, "标题项必须是对象。", diagnostics);
  }
  const item = candidate as Record<string, unknown>;
  if (typeof item.title !== "string" || !item.title.trim()) {
    throw contractError("SCHEMA_MISMATCH", `${path}.title`, "标题文本不能为空。", diagnostics);
  }
  const match = normalizeMatch(item.match);
  if (match === undefined) {
    throw contractError("SCHEMA_MISMATCH", `${path}.match`, "匹配度必须是 0-100 的整数。", diagnostics);
  }
  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `generated-${index}`,
    title: item.title.trim(),
    match,
  };
}

function normalizeMatch(value: unknown) {
  const candidate = typeof value === "string" && /^\d{1,3}$/u.test(value.trim())
    ? Number(value.trim())
    : value;
  return typeof candidate === "number"
    && Number.isInteger(candidate)
    && candidate >= 0
    && candidate <= 100
    ? candidate
    : undefined;
}

function normalizeTags(value: unknown, diagnostics?: TextResponseDiagnostics) {
  const tags = typeof value === "string"
    ? value.split(/[,，\n]/u).map(tag => tag.trim()).filter(Boolean)
    : value;
  if (
    !Array.isArray(tags)
    || tags.length < 1
    || tags.length > 10
    || tags.some(tag => typeof tag !== "string" || !tag.trim())
  ) {
    throw contractError("SCHEMA_MISMATCH", "tags", "Tags 必须包含 1-10 个非空字符串。", diagnostics);
  }
  return tags.map(tag => String(tag).trim());
}

function parseSafetyReport(value: unknown, diagnostics?: TextResponseDiagnostics): SafetyReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw contractError("SCHEMA_MISMATCH", "safetyReport", "Safety Report 必须是对象。", diagnostics);
  }
  const report = value as Record<string, unknown>;
  if (typeof report.score !== "number" || report.score < 0 || report.score > 100) {
    throw contractError("SCHEMA_MISMATCH", "safetyReport.score", "安全分数必须在 0-100 之间。", diagnostics);
  }
  if (!Array.isArray(report.checks)) {
    throw contractError("SCHEMA_MISMATCH", "safetyReport.checks", "安全检查必须是数组。", diagnostics);
  }
  const copying = report.copyingRisk;
  if (!copying || typeof copying !== "object" || Array.isArray(copying)) {
    throw contractError("SCHEMA_MISMATCH", "safetyReport.copyingRisk", "复制风险必须是对象。", diagnostics);
  }
  const risk = copying as Record<string, unknown>;
  if (
    !["passed", "review"].includes(String(risk.status))
    || ["titleExactMatch", "titleHighSimilarity", "bodyLongOverlap", "regenerated"]
      .some(field => typeof risk[field] !== "boolean")
  ) {
    throw contractError("SCHEMA_MISMATCH", "safetyReport.copyingRisk", "复制风险字段无效。", diagnostics);
  }
  return value as SafetyReport;
}

function stripSingleJsonFence(value: string) {
  const match = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
  return match ? match[1].trim() : value;
}

function looksTruncated(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  return !trimmed.endsWith("}") && !trimmed.endsWith("]");
}

function contractError(
  code: "EMPTY_RESPONSE" | "TRUNCATED_RESPONSE" | "INVALID_JSON" | "SCHEMA_MISMATCH",
  path: string,
  reason: string,
  upstreamDiagnostics?: TextResponseDiagnostics,
) {
  return new ModelAdapterError(code, reason, 502, {
    ...upstreamDiagnostics,
    contentContractValid: false,
    jsonParsed: code !== "INVALID_JSON" && code !== "TRUNCATED_RESPONSE",
    schemaErrorPath: path,
    safeReason: reason,
  });
}

function isTextEnvelope(value: unknown): value is {
  content: string;
  diagnostics: TextResponseDiagnostics;
} {
  return Boolean(
    value
    && typeof value === "object"
    && typeof (value as Record<string, unknown>).content === "string"
    && (value as Record<string, unknown>).diagnostics,
  );
}

function extractDiagnostics(value: unknown) {
  return isTextEnvelope(value) ? value.diagnostics : undefined;
}
