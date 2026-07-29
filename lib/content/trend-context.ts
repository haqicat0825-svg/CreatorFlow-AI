import type { TrendAnalysisResult } from "@/lib/analysis/types";

export type TrendContext = TrendAnalysisResult;

const LIMITS = {
  totalLength: 40_000,
  summaryLength: 4_000,
  itemLength: 2_000,
  maxItems: 20,
  maxEvidenceIds: 10,
  maxReferences: 10,
} as const;

export function validateTrendContext(input: unknown): TrendContext {
  if (!isRecord(input)) invalid("trendContext must be an object.");
  if (JSON.stringify(input).length > LIMITS.totalLength) {
    invalid("trendContext exceeds the maximum input length.");
  }
  exactKeys(input, [
    "executiveSummary",
    "trendSignals",
    "viralElements",
    "audienceProfile",
    "audienceInsights",
    "viralReasons",
    "topicCandidates",
    "cautions",
    "sourceReferences",
    "metadata",
  ], "trendContext");

  const sourceReferences = parseReferences(input.sourceReferences);
  const evidenceIds = new Set(sourceReferences.map(({ resultId }) => resultId));
  const executiveSummary = text(input.executiveSummary, "executiveSummary", LIMITS.summaryLength);
  const trendSignals = records(input.trendSignals, "trendSignals").map((item, index) => {
    exactKeys(item, ["signal", "confidence", "evidenceResultIds"], `trendSignals[${index}]`);
    if (
      typeof item.confidence !== "number"
      || !Number.isFinite(item.confidence)
      || item.confidence < 0
      || item.confidence > 1
    ) {
      invalid(`trendSignals[${index}].confidence is invalid.`);
    }
    return {
      signal: text(item.signal, `trendSignals[${index}].signal`),
      confidence: item.confidence,
      evidenceResultIds: parseEvidenceIds(
        item.evidenceResultIds,
        evidenceIds,
        `trendSignals[${index}].evidenceResultIds`,
      ),
    };
  });
  if (!isRecord(input.viralElements)) invalid("viralElements must be an object.");
  exactKeys(input.viralElements, ["colors", "items", "styles", "evidenceResultIds"], "viralElements");
  const viralElements = {
    colors: textList(input.viralElements.colors, "viralElements.colors"),
    items: textList(input.viralElements.items, "viralElements.items"),
    styles: textList(input.viralElements.styles, "viralElements.styles"),
    evidenceResultIds: parseEvidenceIds(
      input.viralElements.evidenceResultIds,
      evidenceIds,
      "viralElements.evidenceResultIds",
    ),
  };
  if (!isRecord(input.audienceProfile)) invalid("audienceProfile must be an object.");
  exactKeys(input.audienceProfile, ["ageRange", "needs", "evidenceResultIds"], "audienceProfile");
  const audienceProfile = {
    ageRange: text(input.audienceProfile.ageRange, "audienceProfile.ageRange"),
    needs: textList(input.audienceProfile.needs, "audienceProfile.needs"),
    evidenceResultIds: parseEvidenceIds(
      input.audienceProfile.evidenceResultIds,
      evidenceIds,
      "audienceProfile.evidenceResultIds",
    ),
  };
  const audienceInsights = records(input.audienceInsights, "audienceInsights").map((item, index) => {
    exactKeys(item, ["insight", "evidenceResultIds"], `audienceInsights[${index}]`);
    return {
      insight: text(item.insight, `audienceInsights[${index}].insight`),
      evidenceResultIds: parseEvidenceIds(
        item.evidenceResultIds,
        evidenceIds,
        `audienceInsights[${index}].evidenceResultIds`,
      ),
    };
  });
  const viralReasons = records(input.viralReasons, "viralReasons").map((item, index) => {
    exactKeys(item, ["reason", "evidenceResultIds"], `viralReasons[${index}]`);
    return {
      reason: text(item.reason, `viralReasons[${index}].reason`),
      evidenceResultIds: parseEvidenceIds(
        item.evidenceResultIds,
        evidenceIds,
        `viralReasons[${index}].evidenceResultIds`,
      ),
    };
  });
  const topicCandidates = records(input.topicCandidates, "topicCandidates").map((item, index) => {
    exactKeys(item, ["title", "angle", "rationale", "evidenceResultIds"], `topicCandidates[${index}]`);
    return {
      title: text(item.title, `topicCandidates[${index}].title`),
      angle: text(item.angle, `topicCandidates[${index}].angle`),
      rationale: text(item.rationale, `topicCandidates[${index}].rationale`),
      evidenceResultIds: parseEvidenceIds(
        item.evidenceResultIds,
        evidenceIds,
        `topicCandidates[${index}].evidenceResultIds`,
      ),
    };
  });
  const cautions = records(input.cautions, "cautions").map((item, index) => {
    exactKeys(item, ["caution", "evidenceResultIds"], `cautions[${index}]`);
    return {
      caution: text(item.caution, `cautions[${index}].caution`),
      evidenceResultIds: parseEvidenceIds(
        item.evidenceResultIds,
        evidenceIds,
        `cautions[${index}].evidenceResultIds`,
      ),
    };
  });

  if (!isRecord(input.metadata)) invalid("trendContext.metadata must be an object.");
  exactKeys(input.metadata, [
    "provider",
    "model",
    "generatedAt",
    "inputResultCount",
    "schemaVersion",
    "isMock",
  ], "metadata");
  if (
    !["deepseek", "mock"].includes(String(input.metadata.provider))
    || typeof input.metadata.model !== "string"
    || !input.metadata.model.trim()
    || typeof input.metadata.generatedAt !== "string"
    || !isIsoDate(input.metadata.generatedAt)
    || input.metadata.inputResultCount !== sourceReferences.length
    || input.metadata.schemaVersion !== "1"
    || typeof input.metadata.isMock !== "boolean"
  ) {
    invalid("trendContext.metadata is invalid.");
  }

  return {
    executiveSummary,
    trendSignals,
    viralElements,
    audienceProfile,
    audienceInsights,
    viralReasons,
    topicCandidates,
    cautions,
    sourceReferences,
    metadata: {
      provider: input.metadata.provider as "deepseek" | "mock",
      model: input.metadata.model.trim(),
      generatedAt: input.metadata.generatedAt,
      inputResultCount: input.metadata.inputResultCount,
      schemaVersion: "1",
      isMock: input.metadata.isMock,
    },
  };
}

export function formatTrendContext(context: TrendContext): string {
  const lines = [
    `Executive summary: ${context.executiveSummary}`,
    ...context.trendSignals.map(
      (item) => `Trend signal (${Math.round(item.confidence * 100)}% confidence; evidence: ${item.evidenceResultIds.join(", ")}): ${item.signal}`,
    ),
    `Viral elements (evidence: ${context.viralElements.evidenceResultIds.join(", ")}): colors=${context.viralElements.colors.join(", ")}; items=${context.viralElements.items.join(", ")}; styles=${context.viralElements.styles.join(", ")}`,
    `Audience profile (evidence: ${context.audienceProfile.evidenceResultIds.join(", ")}): age=${context.audienceProfile.ageRange}; needs=${context.audienceProfile.needs.join(", ")}`,
    ...context.audienceInsights.map(
      (item) => `Audience insight (evidence: ${item.evidenceResultIds.join(", ")}): ${item.insight}`,
    ),
    ...context.viralReasons.map(
      (item) => `Viral reason (evidence: ${item.evidenceResultIds.join(", ")}): ${item.reason}`,
    ),
    ...context.topicCandidates.map(
      (item) => `Topic candidate "${item.title}" (evidence: ${item.evidenceResultIds.join(", ")}): angle=${item.angle}; rationale=${item.rationale}`,
    ),
    ...context.cautions.map(
      (item) => `Caution (evidence: ${item.evidenceResultIds.join(", ")}): ${item.caution}`,
    ),
    "Evidence index:",
    ...context.sourceReferences.map(({ resultId, title }) => `- ${resultId}: ${title}`),
  ];
  return lines.join("\n");
}

function parseReferences(input: unknown) {
  const items = records(input, "sourceReferences", LIMITS.maxReferences);
  const references = items.map((item, index) => {
    exactKeys(item, ["resultId", "title", "sourceUrl"], `sourceReferences[${index}]`);
    const sourceUrl = text(item.sourceUrl, `sourceReferences[${index}].sourceUrl`, 2_000);
    try {
      const parsed = new URL(sourceUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) invalid(`sourceReferences[${index}].sourceUrl is invalid.`);
    } catch {
      invalid(`sourceReferences[${index}].sourceUrl is invalid.`);
    }
    return {
      resultId: text(item.resultId, `sourceReferences[${index}].resultId`, 200),
      title: text(item.title, `sourceReferences[${index}].title`, 200),
      sourceUrl,
    };
  });
  if (new Set(references.map(({ resultId }) => resultId)).size !== references.length) {
    invalid("sourceReferences resultId values must be unique.");
  }
  return references;
}

function parseEvidenceIds(input: unknown, validIds: Set<string>, path: string) {
  if (
    !Array.isArray(input)
    || input.length === 0
    || input.length > LIMITS.maxEvidenceIds
    || input.some((id) => typeof id !== "string" || !id.trim())
  ) {
    invalid(`${path} is invalid.`);
  }
  const ids = [...new Set(input.map((id) => String(id).trim()))];
  if (ids.some((id) => !validIds.has(id))) invalid(`${path} contains unknown evidence.`);
  return ids;
}

function records(input: unknown, path: string, max: number = LIMITS.maxItems): Record<string, unknown>[] {
  if (!Array.isArray(input) || input.length > max) invalid(`${path} is invalid.`);
  return input.map((item, index) => {
    if (!isRecord(item)) invalid(`${path}[${index}] must be an object.`);
    return item;
  });
}

function textList(input: unknown, path: string) {
  if (!Array.isArray(input) || input.length === 0 || input.length > LIMITS.maxItems) {
    invalid(`${path} is invalid.`);
  }
  return [...new Set(input.map((item, index) => text(item, `${path}[${index}]`)))];
}

function text(input: unknown, path: string, max: number = LIMITS.itemLength) {
  if (typeof input !== "string") invalid(`${path} must be a string.`);
  const value = input.normalize("NFKC").trim();
  if (!value || value.length > max) invalid(`${path} is invalid.`);
  return value;
}

function exactKeys(input: Record<string, unknown>, keys: string[], path: string) {
  if (
    Object.keys(input).length !== keys.length
    || keys.some((key) => !(key in input))
  ) {
    invalid(`${path} contains unsupported fields.`);
  }
}

function isIsoDate(value: string) {
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

function invalid(message: string): never {
  throw new Error(message);
}
