import type { SearchResult } from "@/lib/research/types";

export type EvidenceBackedItem = {
  evidenceResultIds: string[];
};

export type TrendSignal = EvidenceBackedItem & {
  signal: string;
  confidence: number;
};

export type AudienceInsight = EvidenceBackedItem & {
  insight: string;
};

export type TopicCandidate = EvidenceBackedItem & {
  title: string;
  angle: string;
  rationale: string;
};

export type TrendCaution = EvidenceBackedItem & {
  caution: string;
};

export type SourceReference = {
  resultId: string;
  title: string;
  sourceUrl: string;
};

export type TrendAnalysisResult = {
  executiveSummary: string;
  trendSignals: TrendSignal[];
  audienceInsights: AudienceInsight[];
  topicCandidates: TopicCandidate[];
  cautions: TrendCaution[];
  sourceReferences: SourceReference[];
  metadata: {
    provider: "deepseek" | "mock";
    model: string;
    generatedAt: string;
    inputResultCount: number;
    schemaVersion: "1";
    isMock: boolean;
  };
};

export interface TrendAnalysisAdapter {
  readonly id: string;
  analyze(results: SearchResult[]): Promise<TrendAnalysisResult>;
}
