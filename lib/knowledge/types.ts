export type KnowledgeSourceType = "manual" | "article" | "note" | "other";
export type KnowledgeContentType = "case-study" | "style-guide" | "title-formula" | "reference";
export type KnowledgeQualityStatus = "draft" | "approved" | "rejected";
export type KnowledgeAuthenticityStatus = "unverified" | "verified" | "disputed";
export type KnowledgeResearchPlatform = "xiaohongshu" | "tavily";

export type KnowledgeResearchMetadata = {
  platform: KnowledgeResearchPlatform;
  researchQuery: string;
  retrievedAt: string;
  isMock: boolean;
  metrics?: Record<string, number>;
};

export type KnowledgeItem = {
  id: string;
  title: string;
  content: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  author?: string;
  publishedAt?: string;
  tags: string[];
  contentType: KnowledgeContentType;
  createdAt: string;
  updatedAt: string;
  qualityStatus: KnowledgeQualityStatus;
  authenticityStatus: KnowledgeAuthenticityStatus;
  research?: KnowledgeResearchMetadata;
  deletedAt?: string;
};

export type CreateKnowledgeItemInput = Pick<
  KnowledgeItem,
  "title" | "content" | "sourceType" | "tags" | "contentType" | "qualityStatus" | "authenticityStatus"
> & Partial<Pick<KnowledgeItem, "sourceUrl" | "author" | "publishedAt" | "research">>;

export type KnowledgeSearchResult = {
  item: KnowledgeItem;
  score: number;
  matchedTerms: string[];
};

export type KnowledgeCitation = {
  id: string;
  title: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  matchedReason: string;
  isMock: boolean;
};
