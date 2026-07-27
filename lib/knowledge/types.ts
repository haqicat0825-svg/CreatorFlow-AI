export type KnowledgeSourceType = "manual" | "article" | "note" | "xiaohongshu" | "other";
export type KnowledgeContentType = "case-study" | "style-guide" | "title-formula" | "reference";
export type KnowledgeQualityStatus = "draft" | "approved" | "rejected";
export type KnowledgeAuthenticityStatus = "unverified" | "verified" | "disputed";
export type KnowledgeResearchPlatform = "xiaohongshu" | "tavily";
export type KnowledgeCategory = "content_knowledge" | "xiaohongshu_case" | "style_preference" | "title_template" | "ai_image";

export type KnowledgeResearchMetadata = {
  platform: KnowledgeResearchPlatform;
  sourceId?: string;
  researchQuery: string;
  retrievedAt: string;
  isMock: boolean;
  coverImage?: string;
  images?: string[];
  likes?: number;
  saves?: number;
  comments?: number;
  metrics?: Record<string, number>;
};

export type KnowledgeItem = {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  author?: string;
  coverImage?: string;
  images?: string[];
  likes?: number;
  saves?: number;
  comments?: number;
  summary?: string;
  publishedAt?: string;
  tags: string[];
  contentType: KnowledgeContentType;
  createdAt: string;
  updatedAt: string;
  qualityStatus: KnowledgeQualityStatus;
  authenticityStatus: KnowledgeAuthenticityStatus;
  research?: KnowledgeResearchMetadata;
  imageUrl?: string;
  prompt?: string;
  model?: string;
  provider?: string;
  deletedAt?: string;
};

export type CreateKnowledgeItemInput = Pick<
  KnowledgeItem,
  "title" | "content" | "sourceType" | "tags" | "contentType" | "qualityStatus" | "authenticityStatus"
> & Partial<Pick<
  KnowledgeItem,
  "category" | "sourceUrl" | "author" | "coverImage" | "images" | "likes" | "saves" | "comments" | "summary" | "publishedAt" | "research" | "imageUrl" | "prompt" | "model" | "provider"
>>;

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
