import { ModelAdapterError } from "@/lib/providers/types";
import { validateSearchResult } from "@/lib/research/normalizer";
import type { SearchResult } from "@/lib/research/types";
import type { TrendAnalysisResult } from "./types";

export const TREND_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["executiveSummary", "trendSignals", "audienceInsights", "topicCandidates", "cautions"],
  properties: {
    executiveSummary: { type: "string", minLength: 1 },
    trendSignals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["signal", "confidence", "evidenceResultIds"],
      },
    },
    audienceInsights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["insight", "evidenceResultIds"],
      },
    },
    topicCandidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "angle", "rationale", "evidenceResultIds"],
      },
    },
    cautions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["caution", "evidenceResultIds"],
      },
    },
  },
} as const;

export function validateResearchResults(input: unknown): SearchResult[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ModelAdapterError("SCHEMA_MISMATCH", "Trend analysis requires at least one research result.", 400);
  }
  const results = input.map(validateSearchResult);
  if (new Set(results.map((result) => result.id)).size !== results.length) {
    throw new ModelAdapterError("SCHEMA_MISMATCH", "Research result ids must be unique.", 400);
  }
  return results;
}

type AnalysisCore = Omit<TrendAnalysisResult, "sourceReferences" | "metadata">;

export function validateTrendAnalysisCore(input: unknown, results: SearchResult[]): AnalysisCore {
  if (!isRecord(input)) fail("$");
  const allowed = new Set(TREND_ANALYSIS_JSON_SCHEMA.required);
  if (Object.keys(input).some((key) => !allowed.has(key as typeof TREND_ANALYSIS_JSON_SCHEMA.required[number]))) {
    fail("$");
  }

  const executiveSummary = nonEmpty(input.executiveSummary, "executiveSummary");
  const trendSignals = array(input.trendSignals, "trendSignals").map((item, index) => {
    exactObject(item, ["signal", "confidence", "evidenceResultIds"], `trendSignals[${index}]`);
    const confidence = item.confidence;
    if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      fail(`trendSignals[${index}].confidence`);
    }
    return {
      signal: nonEmpty(item.signal, `trendSignals[${index}].signal`),
      confidence,
      evidenceResultIds: evidenceIds(item.evidenceResultIds, results, `trendSignals[${index}].evidenceResultIds`),
    };
  });
  const audienceInsights = array(input.audienceInsights, "audienceInsights").map((item, index) => {
    exactObject(item, ["insight", "evidenceResultIds"], `audienceInsights[${index}]`);
    return {
      insight: nonEmpty(item.insight, `audienceInsights[${index}].insight`),
      evidenceResultIds: evidenceIds(item.evidenceResultIds, results, `audienceInsights[${index}].evidenceResultIds`),
    };
  });
  const topicCandidates = array(input.topicCandidates, "topicCandidates").map((item, index) => {
    exactObject(item, ["title", "angle", "rationale", "evidenceResultIds"], `topicCandidates[${index}]`);
    return {
      title: nonEmpty(item.title, `topicCandidates[${index}].title`),
      angle: nonEmpty(item.angle, `topicCandidates[${index}].angle`),
      rationale: nonEmpty(item.rationale, `topicCandidates[${index}].rationale`),
      evidenceResultIds: evidenceIds(item.evidenceResultIds, results, `topicCandidates[${index}].evidenceResultIds`),
    };
  });
  const cautions = array(input.cautions, "cautions").map((item, index) => {
    exactObject(item, ["caution", "evidenceResultIds"], `cautions[${index}]`);
    return {
      caution: nonEmpty(item.caution, `cautions[${index}].caution`),
      evidenceResultIds: evidenceIds(item.evidenceResultIds, results, `cautions[${index}].evidenceResultIds`),
    };
  });
  return { executiveSummary, trendSignals, audienceInsights, topicCandidates, cautions };
}

function evidenceIds(input: unknown, results: SearchResult[], path: string) {
  if (!Array.isArray(input) || input.length === 0 || input.some((id) => typeof id !== "string")) fail(path);
  const validIds = new Set(results.map((result) => result.id));
  const ids = [...new Set(input as string[])];
  if (ids.some((id) => !validIds.has(id))) {
    throw new ModelAdapterError("SCHEMA_MISMATCH", "Analysis cited an unknown research result id.", 502, {
      schemaErrorPath: path,
    });
  }
  return ids;
}

function array(input: unknown, path: string): Record<string, unknown>[] {
  if (!Array.isArray(input)) fail(path);
  return input.map((item, index) => {
    if (!isRecord(item)) fail(`${path}[${index}]`);
    return item;
  });
}

function exactObject(input: unknown, keys: string[], path: string): asserts input is Record<string, unknown> {
  if (!isRecord(input) || Object.keys(input).length !== keys.length || keys.some((key) => !(key in input))) fail(path);
}

function nonEmpty(input: unknown, path: string) {
  if (typeof input !== "string" || !input.trim()) fail(path);
  if (/(?:https?:\/\/|www\.)\S+/iu.test(input)) {
    throw new ModelAdapterError("SCHEMA_MISMATCH", "Model-generated URLs are not allowed.", 502, {
      schemaErrorPath: path,
    });
  }
  return input.trim();
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

function fail(path: string): never {
  throw new ModelAdapterError("SCHEMA_MISMATCH", "Trend analysis response failed JSON Schema validation.", 502, {
    schemaErrorPath: path,
  });
}
