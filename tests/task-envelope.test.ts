import { beforeEach, describe, expect, it } from "vitest";
import type { TrendAnalysisResult } from "@/lib/analysis/types";
import type { ContentTask } from "@/lib/types";
import {
  CREATOR_TASK_STORAGE_KEY,
  createTrendContextFromSelection,
  PENDING_TREND_SELECTION_STORAGE_KEY,
  storeTrendSelectionForCreator,
  type CreatorTaskEnvelope,
} from "@/lib/content/task-envelope";

const brief: ContentTask = {
  topic: "秋季通勤穿搭",
  audiences: ["通勤女性"],
  styles: ["简约"],
  goal: "种草" as ContentTask["goal"],
  useIntelligence: true,
};

const analysis: TrendAnalysisResult = {
  executiveSummary: "Layered dressing is gaining attention.",
  trendSignals: [
    {
      signal: "Practical layering is rising.",
      confidence: 0.82,
      evidenceResultIds: ["result-1"],
    },
    {
      signal: "Unrelated color trend.",
      confidence: 0.7,
      evidenceResultIds: ["result-2"],
    },
  ],
  audienceInsights: [{
    insight: "Commuters prefer reusable combinations.",
    evidenceResultIds: ["result-1"],
  }],
  topicCandidates: [
    {
      title: "Three layering formulas",
      angle: "Start from commuting scenarios.",
      rationale: "The evidence highlights practical combinations.",
      evidenceResultIds: ["result-1"],
    },
    {
      title: "Seasonal color forecast",
      angle: "Focus on color.",
      rationale: "A separate source discusses color.",
      evidenceResultIds: ["result-2"],
    },
  ],
  cautions: [{
    caution: "Do not claim unsupported engagement metrics.",
    evidenceResultIds: ["result-1"],
  }],
  sourceReferences: [
    {
      resultId: "result-1",
      title: "Layering evidence",
      sourceUrl: "https://example.com/layering",
    },
    {
      resultId: "result-2",
      title: "Color evidence",
      sourceUrl: "https://example.com/color",
    },
  ],
  metadata: {
    provider: "mock",
    model: "test-analysis",
    generatedAt: "2026-07-26T00:00:00.000Z",
    inputResultCount: 2,
    schemaVersion: "1",
    isMock: true,
  },
};

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("CreatorTaskEnvelope trend handoff", () => {
  it("creates a cropped TrendContext for the selected topic", () => {
    const selectedTopic = analysis.topicCandidates[0];
    const context = createTrendContextFromSelection(analysis, selectedTopic);

    expect(context.topicCandidates).toEqual([selectedTopic]);
    expect(context.trendSignals).toEqual([analysis.trendSignals[0]]);
    expect(context.audienceInsights).toEqual(analysis.audienceInsights);
    expect(context.cautions).toEqual(analysis.cautions);
    expect(context.sourceReferences).toEqual([analysis.sourceReferences[0]]);
    expect(context).not.toBe(analysis);
  });

  it("rejects a missing topic selection", () => {
    expect(() => createTrendContextFromSelection(analysis, undefined)).toThrow(
      /selected topic is required/i,
    );
  });

  it("preserves evidence ids and mock status", () => {
    const context = createTrendContextFromSelection(
      analysis,
      analysis.topicCandidates[0],
    );

    expect(context.topicCandidates[0].evidenceResultIds).toEqual(["result-1"]);
    expect(context.trendSignals[0].evidenceResultIds).toEqual(["result-1"]);
    expect(context.metadata.isMock).toBe(true);
    expect(context.metadata.provider).toBe("mock");
  });

  it("emits only the known TrendContext fields", () => {
    const analysisWithUnknownFields = {
      ...analysis,
      internalPrompt: "must not cross the handoff boundary",
      topicCandidates: [{
        ...analysis.topicCandidates[0],
        internalScore: 99,
      }, analysis.topicCandidates[1]],
    } as TrendAnalysisResult;
    const context = createTrendContextFromSelection(
      analysisWithUnknownFields,
      analysisWithUnknownFields.topicCandidates[0],
    );

    expect(Object.keys(context).sort()).toEqual([
      "audienceInsights",
      "cautions",
      "executiveSummary",
      "metadata",
      "sourceReferences",
      "topicCandidates",
      "trendSignals",
    ]);
    expect(Object.keys(context.topicCandidates[0]).sort()).toEqual([
      "angle",
      "evidenceResultIds",
      "rationale",
      "title",
    ]);
  });

  it("keeps legacy ContentTask assignable as the envelope brief", () => {
    const envelope: CreatorTaskEnvelope = {
      schemaVersion: "1",
      brief,
    };

    expect(envelope).toEqual({ schemaVersion: "1", brief });
  });

  it("stores an envelope when a complete brief already exists", () => {
    window.sessionStorage.setItem(CREATOR_TASK_STORAGE_KEY, JSON.stringify(brief));

    const destination = storeTrendSelectionForCreator(
      window.sessionStorage,
      analysis,
      analysis.topicCandidates[0],
    );

    expect(destination).toBe("/creator");
    expect(JSON.parse(
      window.sessionStorage.getItem(CREATOR_TASK_STORAGE_KEY) ?? "{}",
    )).toEqual({
      schemaVersion: "1",
      brief: { ...brief, topic: analysis.topicCandidates[0].title },
      trendContext: createTrendContextFromSelection(
        analysis,
        analysis.topicCandidates[0],
      ),
    });
  });

  it("stores only a pending cropped selection when no complete brief exists", () => {
    const destination = storeTrendSelectionForCreator(
      window.sessionStorage,
      analysis,
      analysis.topicCandidates[0],
    );

    expect(destination).toBe("/create-task");
    const pending = JSON.parse(
      window.sessionStorage.getItem(PENDING_TREND_SELECTION_STORAGE_KEY) ?? "{}",
    );
    expect(pending.topic).toBe(analysis.topicCandidates[0].title);
    expect(pending.trendContext.topicCandidates).toHaveLength(1);
    expect(JSON.stringify(pending)).not.toContain("Unrelated color trend.");
    expect(window.sessionStorage.getItem(CREATOR_TASK_STORAGE_KEY)).toBeNull();
  });
});
