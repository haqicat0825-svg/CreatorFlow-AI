import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { findDuplicate } from "./deduplicator";
import type { CreateKnowledgeItemInput, KnowledgeCategory, KnowledgeItem, KnowledgeSearchResult } from "./types";

export class KnowledgeRepositoryError extends Error {
  constructor(
    public readonly code: "DUPLICATE" | "NOT_FOUND" | "INVALID_INPUT" | "STORAGE_ERROR",
    message: string,
    public readonly existingId?: string,
  ) {
    super(message);
    this.name = "KnowledgeRepositoryError";
  }
}

export class FileKnowledgeRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath = getKnowledgeFilePath(),
    private readonly replaceFile: typeof rename = rename,
  ) {}

  async create(input: CreateKnowledgeItemInput) {
    const safe = validateCreateInput(input);
    let created!: KnowledgeItem;
    await this.withWriteLock(async () => {
      const items = await this.readAll();
      const duplicate = findDuplicate(items, safe);
      if (duplicate) {
        throw new KnowledgeRepositoryError("DUPLICATE", "相同知识条目已存在。", duplicate.id);
      }
      const now = new Date().toISOString();
      created = {
        ...safe,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      await this.writeAll([...items, created]);
    });
    return created;
  }

  async list(options: { includeDeleted?: boolean } = {}) {
    const items = await this.readAll();
    return items
      .filter(item => options.includeDeleted || !item.deletedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getById(id: string) {
    const item = (await this.readAll()).find(candidate => candidate.id === id && !candidate.deletedAt);
    if (!item) throw new KnowledgeRepositoryError("NOT_FOUND", "知识条目不存在。");
    return item;
  }

  async delete(ids: string[]) {
    const uniqueIds = [...new Set(ids.map(id => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0 || uniqueIds.length > 100) {
      throw new KnowledgeRepositoryError("INVALID_INPUT", "请选择 1-100 条知识记录。");
    }
    let deletedIds: string[] = [];
    await this.withWriteLock(async () => {
      const items = await this.readAll();
      const activeIds = new Set(items.filter(item => !item.deletedAt).map(item => item.id));
      deletedIds = uniqueIds.filter(id => activeIds.has(id));
      if (deletedIds.length !== uniqueIds.length) {
        throw new KnowledgeRepositoryError("NOT_FOUND", "部分知识条目不存在。");
      }
      const deletedAt = new Date().toISOString();
      const targets = new Set(deletedIds);
      await this.writeAll(items.map(item => targets.has(item.id)
        ? { ...item, deletedAt, updatedAt: deletedAt }
        : item));
    });
    return deletedIds;
  }

  async updateCategory(id: string, category: KnowledgeCategory) {
    const safeCategory = validateCategory(category);
    let updated!: KnowledgeItem;
    await this.withWriteLock(async () => {
      const items = await this.readAll();
      const index = items.findIndex(item => item.id === id && !item.deletedAt);
      if (index < 0) throw new KnowledgeRepositoryError("NOT_FOUND", "知识条目不存在。");
      const now = new Date().toISOString();
      updated = { ...items[index], category: safeCategory, updatedAt: now };
      items[index] = updated;
      await this.writeAll(items);
    });
    return updated;
  }

  async search(query: string, options: { limit?: number; tags?: string[]; categories?: KnowledgeCategory[] } = {}): Promise<KnowledgeSearchResult[]> {
    const terms = tokenize(query);
    const requestedTags = (options.tags ?? []).map(normalize);
    const items = await this.list();
    return items
      .filter(item => item.qualityStatus === "approved" && item.authenticityStatus !== "disputed")
      .filter(item => !options.categories?.length || options.categories.includes(item.category))
      .map(item => scoreItem(item, terms, requestedTags))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || b.item.updatedAt.localeCompare(a.item.updatedAt))
      .slice(0, Math.min(Math.max(options.limit ?? 5, 1), 20));
  }

  private async readAll(): Promise<KnowledgeItem[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeStoredItem).filter((item): item is KnowledgeItem => Boolean(item)) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new KnowledgeRepositoryError("STORAGE_ERROR", "无法读取本地知识库。");
    }
  }

  private async writeAll(items: KnowledgeItem[]) {
    let temporary: string | undefined;
    try {
      const directory = path.dirname(this.filePath);
      await mkdir(directory, { recursive: true });
      const serialized = JSON.stringify(items, null, 2);
      validateSerializedRepository(serialized);
      temporary = path.join(directory, `.${path.basename(this.filePath)}.${process.pid}.${Date.now()}.tmp`);
      await writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
      validateSerializedRepository(await readFile(temporary, "utf8"));
      await this.replaceFile(temporary, this.filePath);
      temporary = undefined;
    } catch {
      throw new KnowledgeRepositoryError("STORAGE_ERROR", "无法写入本地知识库。");
    } finally {
      if (temporary) await rm(temporary, { force: true }).catch(() => undefined);
    }
  }

  private async withWriteLock<T>(work: () => Promise<T>) {
    const previous = this.writeQueue;
    let release!: () => void;
    this.writeQueue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }
}

let repository: FileKnowledgeRepository | undefined;
export function getKnowledgeRepository() {
  repository ??= new FileKnowledgeRepository();
  return repository;
}

function getKnowledgeFilePath() {
  const projectRoot = path.resolve(process.cwd());
  const configuredDirectory = process.env.CREATORFLOW_DATA_DIR;
  const dataDirectory = configuredDirectory
    ? resolveServerDataDirectory(configuredDirectory, projectRoot)
    : path.join(projectRoot, ".creatorflow-data");
  const filePath = path.resolve(dataDirectory, "knowledge.json");
  if (path.dirname(filePath) !== path.resolve(dataDirectory)) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "Knowledge repository path is invalid.");
  }
  return filePath;
}

function resolveServerDataDirectory(configured: string, projectRoot: string) {
  const value = configured.trim();
  if (!value || /[\0\r\n]/u.test(value)) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "CREATORFLOW_DATA_DIR is invalid.");
  }
  if (path.isAbsolute(value)) return path.resolve(value);
  const resolved = path.resolve(projectRoot, value);
  const relative = path.relative(projectRoot, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "CREATORFLOW_DATA_DIR cannot escape the project root.");
  }
  return resolved;
}

function validateSerializedRepository(raw: string) {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Repository payload must be an array.");
}

function validateCreateInput(input: CreateKnowledgeItemInput): CreateKnowledgeItemInput & { category: KnowledgeCategory } {
  if (!input || typeof input !== "object") throw new KnowledgeRepositoryError("INVALID_INPUT", "知识条目无效。");
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 200) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "标题不能为空且不能超过 200 字。");
  }
  if (typeof input.content !== "string" || !input.content.trim() || input.content.length > 50_000) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "内容不能为空且不能超过 50000 字。");
  }
  const sourceTypes = ["manual", "article", "note", "xiaohongshu", "other"];
  const contentTypes = ["case-study", "style-guide", "title-formula", "reference"];
  const qualityStatuses = ["draft", "approved", "rejected"];
  const authenticityStatuses = ["unverified", "verified", "disputed"];
  const category = input.category ? validateCategory(input.category) : inferCategory(input);
  if (!sourceTypes.includes(input.sourceType)) throw new KnowledgeRepositoryError("INVALID_INPUT", "来源类型无效。");
  if (!contentTypes.includes(input.contentType)) throw new KnowledgeRepositoryError("INVALID_INPUT", "内容类型无效。");
  if (!qualityStatuses.includes(input.qualityStatus)) throw new KnowledgeRepositoryError("INVALID_INPUT", "质量状态无效。");
  if (!authenticityStatuses.includes(input.authenticityStatus)) throw new KnowledgeRepositoryError("INVALID_INPUT", "真实性状态无效。");
  if (!Array.isArray(input.tags) || input.tags.length > 20 || input.tags.some(tag => typeof tag !== "string" || tag.length > 60)) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "标签格式无效。");
  }
  let sourceUrl: string | undefined;
  if (input.sourceUrl) {
    try {
      const url = new URL(input.sourceUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      sourceUrl = url.toString();
    } catch {
      throw new KnowledgeRepositoryError("INVALID_INPUT", "来源链接无效。");
    }
  }
  return {
    title: input.title.trim(),
    category,
    content: input.content.trim(),
    sourceType: input.sourceType,
    sourceUrl,
    author: input.author?.trim() || undefined,
    coverImage: validateOptionalHttpUrl(input.coverImage),
    images: validateOptionalHttpUrls(input.images),
    likes: validateOptionalMetric(input.likes),
    saves: validateOptionalMetric(input.saves),
    comments: validateOptionalMetric(input.comments),
    summary: typeof input.summary === "string" ? input.summary.trim().slice(0, 10_000) || undefined : undefined,
    publishedAt: input.publishedAt || undefined,
    tags: [...new Set(input.tags.map(tag => tag.trim()).filter(Boolean))],
    contentType: input.contentType,
    qualityStatus: input.qualityStatus,
    authenticityStatus: input.authenticityStatus,
    research: validateResearchMetadata(input.research),
    imageUrl: validateOptionalAssetUrl(input.imageUrl),
    prompt: validateOptionalText(input.prompt, 10_000),
    model: validateOptionalText(input.model, 200),
    provider: validateOptionalText(input.provider, 200),
  };
}

function validateCategory(value: unknown): KnowledgeCategory {
  const categories: KnowledgeCategory[] = ["content_knowledge", "xiaohongshu_case", "style_preference", "title_template", "ai_image"];
  if (!categories.includes(value as KnowledgeCategory)) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "知识库分类无效。");
  }
  return value as KnowledgeCategory;
}

function inferCategory(item: Pick<CreateKnowledgeItemInput, "sourceType" | "contentType">): KnowledgeCategory {
  if (item.sourceType === "xiaohongshu") return "xiaohongshu_case";
  if (item.contentType === "title-formula") return "title_template";
  if (item.contentType === "style-guide") return "style_preference";
  return "content_knowledge";
}

function normalizeStoredItem(value: unknown): KnowledgeItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as KnowledgeItem;
  if (!item.id || item.deletedAt) return item;
  if (!item.category) {
    item.category = item.sourceType === "xiaohongshu" || item.research?.platform === "xiaohongshu"
      ? "xiaohongshu_case"
      : item.contentType === "style-guide"
        ? "style_preference"
        : item.contentType === "title-formula"
          ? "title_template"
          : "style_preference";
  }
  return item;
}

function validateOptionalText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) || undefined : undefined;
}

function validateResearchMetadata(research: CreateKnowledgeItemInput["research"]) {
  if (!research) return undefined;
  if (
    !["xiaohongshu", "tavily"].includes(research.platform)
    || typeof research.researchQuery !== "string"
    || !research.researchQuery.trim()
    || research.researchQuery.length > 80
    || typeof research.retrievedAt !== "string"
    || typeof research.isMock !== "boolean"
  ) {
    throw new KnowledgeRepositoryError("INVALID_INPUT", "研究来源元数据无效。");
  }
  const metrics = research.metrics
    ? Object.fromEntries(Object.entries(research.metrics).filter((entry): entry is [string, number] => (
      typeof entry[1] === "number" && Number.isFinite(entry[1])
    )))
    : undefined;
  const sourceId = typeof research.sourceId === "string"
    ? research.sourceId.trim().slice(0, 200) || undefined
    : undefined;
  const coverImage = validateOptionalHttpUrl(research.coverImage);
  const images = validateOptionalHttpUrls(research.images);
  return {
    platform: research.platform,
    sourceId,
    researchQuery: research.researchQuery.trim(),
    retrievedAt: research.retrievedAt,
    isMock: research.isMock,
    coverImage,
    images: images?.length ? images : undefined,
    likes: validateOptionalMetric(research.likes),
    saves: validateOptionalMetric(research.saves),
    comments: validateOptionalMetric(research.comments),
    metrics: metrics && Object.keys(metrics).length ? metrics : undefined,
  };
}

function validateOptionalHttpUrls(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const images = [...new Set(value.map(validateOptionalHttpUrl).filter((image): image is string => Boolean(image)))].slice(0, 20);
  return images.length ? images : undefined;
}

function validateOptionalHttpUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function validateOptionalAssetUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 1_500_000) return undefined;
  if (/^data:image\/(?:png|jpeg|webp|svg\+xml);/u.test(value)) return value;
  return validateOptionalHttpUrl(value);
}

function validateOptionalMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function tokenize(value: string) {
  const normalized = normalize(value);
  const words = normalized.match(/[\p{L}\p{N}]{2,}/gu) ?? [];
  const terms = new Set(words);
  for (const word of words) {
    if (/[\u3400-\u9fff]/u.test(word) && word.length > 2) {
      for (let index = 0; index < word.length - 1; index += 1) terms.add(word.slice(index, index + 2));
    }
  }
  return [...terms].slice(0, 50);
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().trim();
}

function scoreItem(item: KnowledgeItem, terms: string[], requestedTags: string[]): KnowledgeSearchResult {
  const title = normalize(item.title);
  const content = normalize(item.content);
  const tags = item.tags.map(normalize);
  const matched = new Set<string>();
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) { score += 6; matched.add(term); }
    if (tags.some(tag => tag.includes(term) || term.includes(tag))) { score += 5; matched.add(term); }
    if (content.includes(term)) { score += 2; matched.add(term); }
  }
  for (const tag of requestedTags) {
    if (tags.some(itemTag => itemTag === tag || itemTag.includes(tag) || tag.includes(itemTag))) {
      score += 8;
      matched.add(tag);
    }
  }
  if (score > 0 && item.authenticityStatus === "verified") score += 1;
  if (item.research?.isMock) score *= 0.25;
  return { item, score, matchedTerms: [...matched] };
}
