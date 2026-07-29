import type {
  TopicCandidate,
  TrendAnalysisResult,
} from "@/lib/analysis/types";
import type { ContentTask } from "@/lib/types";
import { parseContentBrief } from "./validation";
import {
  validateTrendContext,
  type TrendContext,
} from "./trend-context";

export const CREATOR_TASK_STORAGE_KEY = "creatorflow-task";
export const PENDING_TREND_SELECTION_STORAGE_KEY = "creatorflow-pending-trend";

export type CreatorTaskEnvelope = {
  schemaVersion: "1";
  brief: ContentTask;
  trendContext?: TrendContext;
};

export type PendingTrendSelection = {
  schemaVersion: "1";
  topic: string;
  trendContext: TrendContext;
};

type TaskStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseStoredCreatorTask(value: string): CreatorTaskEnvelope {
  let input: unknown;
  try {
    input = JSON.parse(value);
  } catch {
    throw new Error("Stored creator task is not valid JSON.");
  }

  if (
    input
    && typeof input === "object"
    && !Array.isArray(input)
    && "schemaVersion" in input
  ) {
    const envelope = input as Record<string, unknown>;
    exactKeys(envelope, ["schemaVersion", "brief", "trendContext"]);
    if (envelope.schemaVersion !== "1") {
      throw new Error("Stored creator task schemaVersion is unsupported.");
    }
    return {
      schemaVersion: "1",
      brief: parseContentBrief(envelope.brief),
      ...(envelope.trendContext === undefined
        ? {}
        : { trendContext: validateTrendContext(envelope.trendContext) }),
    };
  }

  return {
    schemaVersion: "1",
    brief: parseContentBrief(input),
  };
}

export function parsePendingTrendSelection(
  value: string,
): PendingTrendSelection {
  let input: unknown;
  try {
    input = JSON.parse(value);
  } catch {
    throw new Error("Pending trend selection is not valid JSON.");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Pending trend selection must be an object.");
  }
  const pending = input as Record<string, unknown>;
  exactKeys(pending, ["schemaVersion", "topic", "trendContext"]);
  if (
    pending.schemaVersion !== "1"
    || typeof pending.topic !== "string"
    || !pending.topic.trim()
  ) {
    throw new Error("Pending trend selection is invalid.");
  }
  return {
    schemaVersion: "1",
    topic: pending.topic.trim(),
    trendContext: validateTrendContext(pending.trendContext),
  };
}

export function storeTrendSelectionForCreator(
  storage: TaskStorage,
  analysis: TrendAnalysisResult,
  selectedTopic: TopicCandidate,
): "/creator" | "/create-task" {
  const trendContext = createTrendContextFromSelection(
    analysis,
    selectedTopic,
  );
  const storedTask = storage.getItem(CREATOR_TASK_STORAGE_KEY);

  if (storedTask) {
    try {
      const current = parseStoredCreatorTask(storedTask);
      const envelope: CreatorTaskEnvelope = {
        schemaVersion: "1",
        brief: {
          ...current.brief,
          topic: selectedTopic.title,
        },
        trendContext,
      };
      storage.setItem(CREATOR_TASK_STORAGE_KEY, JSON.stringify(envelope));
      storage.removeItem(PENDING_TREND_SELECTION_STORAGE_KEY);
      return "/creator";
    } catch {
      // An incomplete or invalid task cannot supply user-approved brief fields.
    }
  }

  const pending: PendingTrendSelection = {
    schemaVersion: "1",
    topic: selectedTopic.title,
    trendContext,
  };
  storage.setItem(
    PENDING_TREND_SELECTION_STORAGE_KEY,
    JSON.stringify(pending),
  );
  storage.removeItem(CREATOR_TASK_STORAGE_KEY);
  return "/create-task";
}

export function createTrendContextFromSelection(
  analysis: TrendAnalysisResult,
  selectedTopic: TopicCandidate | null | undefined,
): TrendContext {
  if (!selectedTopic) {
    throw new Error("A selected topic is required to create TrendContext.");
  }

  const topic = analysis.topicCandidates.find((candidate) =>
    sameTopicCandidate(candidate, selectedTopic)
  );
  if (!topic) {
    throw new Error("The selected topic is not part of the analysis result.");
  }

  const selectedEvidenceIds = new Set(topic.evidenceResultIds);
  const trendSignals = analysis.trendSignals.filter((item) =>
    overlapsEvidence(item.evidenceResultIds, selectedEvidenceIds)
  );
  const audienceInsights = analysis.audienceInsights.filter((item) =>
    overlapsEvidence(item.evidenceResultIds, selectedEvidenceIds)
  );
  const viralReasons = analysis.viralReasons.filter((item) =>
    overlapsEvidence(item.evidenceResultIds, selectedEvidenceIds)
  );
  const cautions = analysis.cautions.filter((item) =>
    overlapsEvidence(item.evidenceResultIds, selectedEvidenceIds)
  );

  const retainedEvidenceIds = new Set([
    ...topic.evidenceResultIds,
    ...trendSignals.flatMap((item) => item.evidenceResultIds),
    ...analysis.viralElements.evidenceResultIds,
    ...analysis.audienceProfile.evidenceResultIds,
    ...audienceInsights.flatMap((item) => item.evidenceResultIds),
    ...viralReasons.flatMap((item) => item.evidenceResultIds),
    ...cautions.flatMap((item) => item.evidenceResultIds),
  ]);
  const sourceReferences = analysis.sourceReferences.filter(({ resultId }) =>
    retainedEvidenceIds.has(resultId)
  );

  return validateTrendContext({
    executiveSummary: analysis.executiveSummary,
    trendSignals: trendSignals.map(({ signal, confidence, evidenceResultIds }) => ({
      signal,
      confidence,
      evidenceResultIds: [...evidenceResultIds],
    })),
    viralElements: {
      colors: [...analysis.viralElements.colors],
      items: [...analysis.viralElements.items],
      styles: [...analysis.viralElements.styles],
      evidenceResultIds: [...analysis.viralElements.evidenceResultIds],
    },
    audienceProfile: {
      ageRange: analysis.audienceProfile.ageRange,
      needs: [...analysis.audienceProfile.needs],
      evidenceResultIds: [...analysis.audienceProfile.evidenceResultIds],
    },
    audienceInsights: audienceInsights.map(({ insight, evidenceResultIds }) => ({
      insight,
      evidenceResultIds: [...evidenceResultIds],
    })),
    viralReasons: viralReasons.map(({ reason, evidenceResultIds }) => ({
      reason,
      evidenceResultIds: [...evidenceResultIds],
    })),
    topicCandidates: [{
      title: topic.title,
      angle: topic.angle,
      rationale: topic.rationale,
      evidenceResultIds: [...topic.evidenceResultIds],
    }],
    cautions: cautions.map(({ caution, evidenceResultIds }) => ({
      caution,
      evidenceResultIds: [...evidenceResultIds],
    })),
    sourceReferences: sourceReferences.map(({ resultId, title, sourceUrl }) => ({
      resultId,
      title,
      sourceUrl,
    })),
    metadata: {
      provider: analysis.metadata.provider,
      model: analysis.metadata.model,
      generatedAt: analysis.metadata.generatedAt,
      inputResultCount: sourceReferences.length,
      schemaVersion: analysis.metadata.schemaVersion,
      isMock: analysis.metadata.isMock,
    },
  });
}

function overlapsEvidence(ids: string[], selectedIds: Set<string>) {
  return ids.some((id) => selectedIds.has(id));
}

function sameTopicCandidate(left: TopicCandidate, right: TopicCandidate) {
  return left.title === right.title
    && left.angle === right.angle
    && left.rationale === right.rationale
    && left.evidenceResultIds.length === right.evidenceResultIds.length
    && left.evidenceResultIds.every(
      (id, index) => id === right.evidenceResultIds[index],
    );
}

function exactKeys(input: Record<string, unknown>, allowedKeys: string[]) {
  const allowed = new Set(allowedKeys);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new Error("Stored handoff contains unsupported fields.");
  }
}
