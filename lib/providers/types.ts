import type { ContentTask, SafetyReport, TitleCandidate } from "@/lib/types";
import type { KnowledgeCitation } from "@/lib/knowledge/types";
import type { TrendContext } from "@/lib/content/trend-context";

export type GeneratedContent = {
  titles: TitleCandidate[];
  body: string;
  tags: string[];
  coverPrompt: string;
  safetyReport: SafetyReport;
  metadata: {
    provider: string;
    model: string;
  };
  isMock: boolean;
  ragUsed: boolean;
  ragReferences: KnowledgeCitation[];
  /** @deprecated Use ragReferences. */
  sources?: KnowledgeCitation[];
};

export interface TextModelAdapter {
  id: string;
  model: string;
  testConnection(): Promise<TextConnectionResult>;
  generate(task: ContentTask, options?: {
    ragContext?: string;
    trendContext?: TrendContext;
    copyingRiskRetry?: boolean;
  }): Promise<unknown>;
}

export type TextResponseDiagnostics = {
  upstreamConnected: boolean;
  contentContractValid?: boolean | null;
  httpStatus?: number;
  choicesCount: number;
  contentPresent: boolean;
  contentLength: number;
  finishReason?: string;
  contentEmpty: boolean;
  hasMarkdownFence: boolean;
  jsonParsed?: boolean;
  schemaErrorPath?: string;
  safeReason?: string;
  requestId?: string;
};

export type TextConnectionResult = {
  upstreamConnected: boolean;
  contentContractValid: null;
  diagnostics: TextResponseDiagnostics;
};

export interface ImageModelAdapter {
  id: string;
  model: string;
  generatePrompt(task: ContentTask): Promise<{ prompt: string }>;
}

export type ModelErrorCode =
  | "CONFIGURATION_MISSING"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "EMPTY_RESPONSE"
  | "TRUNCATED_RESPONSE"
  | "INVALID_JSON"
  | "SCHEMA_MISMATCH"
  | "INVALID_RESPONSE"
  | "MODEL_UNAVAILABLE"
  | "LOCAL_CLI_DISABLED"
  | "CONTENT_REJECTED"
  | "UPSTREAM_ERROR";

export class ModelAdapterError extends Error {
  constructor(
    public readonly code: ModelErrorCode,
    message: string,
    public readonly status = 502,
    public readonly diagnostics?: Partial<TextResponseDiagnostics>,
  ) {
    super(message);
    this.name = "ModelAdapterError";
  }
}
