export const RESEARCH_CONFIG = {
  maxQueryLength: 80,
  maxResults: 10,
  cooldownMs: 15_000,
  timeoutMs: 12_000,
  maxOutputBytes: 1_000_000,
  transientRetryCount: 1,
} as const;

export type SearchRequest = {
  query: string;
  limit: number;
  sortMode?: "general" | "popular" | "latest";
  contentType?: "all" | "video" | "image";
};

export type SearchMetrics = Record<string, number>;

export type SearchResult = {
  id: string;
  title: string;
  summary: string;
  author?: string;
  publishedAt?: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  metrics?: SearchMetrics;
  tags: string[];
  source: "xiaohongshu" | "tavily";
  retrievedAt: string;
  isMock: boolean;
};

export type LoginStatus = {
  available: boolean;
  loggedIn: boolean;
  provider: "xiaohongshu-cli" | "tavily" | "mock";
  safeMessage: string;
};

export interface ResearchAdapter {
  searchContent(request: SearchRequest): Promise<SearchResult[]>;
  checkLoginStatus(): Promise<LoginStatus>;
}
