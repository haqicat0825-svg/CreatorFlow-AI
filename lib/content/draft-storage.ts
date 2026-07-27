import type { Draft } from "@/lib/types";

export const DRAFT_STORAGE_KEY = "creatorflow-drafts";
export const DRAFT_STORAGE_EVENT = "creatorflow:drafts-updated";

type DraftCollection = { schemaVersion: "1"; drafts: Draft[] };
export type DraftInput = Pick<Draft, "title" | "content" | "tags" | "coverImage" | "imageSource" | "model"> & {
  images?: string[];
};

export function loadDrafts(storage: Pick<Storage, "getItem">): Draft[] {
  const raw = storage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as Partial<DraftCollection>;
    if (value.schemaVersion !== "1" || !Array.isArray(value.drafts)) return [];
    return value.drafts.filter(isDraft).map(normalizeDraft).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function saveDraft(storage: Pick<Storage, "getItem" | "setItem">, input: DraftInput): Draft {
  const draft: Draft = {
    id: crypto.randomUUID(),
    title: input.title.trim().slice(0, 300),
    content: input.content.trim().slice(0, 100_000),
    tags: sanitizeTags(input.tags),
    coverImage: input.coverImage,
    images: uniqueImages(input.images ?? [], input.coverImage),
    imageSource: input.imageSource,
    model: input.model.trim().slice(0, 200),
    status: "draft",
    publishStatus: "draft",
    platform: "xiaohongshu",
    createdAt: new Date().toISOString(),
  };
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
    schemaVersion: "1",
    drafts: [draft, ...loadDrafts(storage)],
  } satisfies DraftCollection));
  dispatchDraftUpdate(draft);
  return draft;
}

export function getDraft(storage: Pick<Storage, "getItem">, id: string): Draft | undefined {
  return loadDrafts(storage).find(draft => draft.id === id);
}

export function updateDraft(
  storage: Pick<Storage, "getItem" | "setItem">,
  id: string,
  changes: Partial<Pick<Draft, "title" | "content" | "tags" | "coverImage" | "images" | "imageSource" | "publishStatus">>,
): Draft | undefined {
  const drafts = loadDrafts(storage);
  const current = drafts.find(draft => draft.id === id);
  if (!current) return undefined;
  const updated: Draft = {
    ...current,
    ...changes,
    title: changes.title === undefined ? current.title : changes.title.trim().slice(0, 300),
    content: changes.content === undefined ? current.content : changes.content.trim().slice(0, 100_000),
    tags: changes.tags === undefined ? current.tags : sanitizeTags(changes.tags),
    images: uniqueImages(changes.images ?? current.images, changes.coverImage ?? current.coverImage),
  };
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
    schemaVersion: "1",
    drafts: drafts.map(draft => draft.id === id ? updated : draft),
  } satisfies DraftCollection));
  dispatchDraftUpdate(updated);
  return updated;
}

function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<Draft>;
  return typeof draft.id === "string"
    && typeof draft.title === "string"
    && typeof draft.content === "string"
    && Array.isArray(draft.tags)
    && typeof draft.coverImage === "string"
    && (!("images" in draft) || Array.isArray(draft.images))
    && ["generated", "library", "upload", "none"].includes(draft.imageSource ?? "")
    && typeof draft.model === "string"
    && draft.status === "draft"
    && ["draft", "reviewing", "ready", "published"].includes(draft.publishStatus ?? "")
    && draft.platform === "xiaohongshu"
    && typeof draft.createdAt === "string";
}

function normalizeDraft(draft: Draft): Draft {
  return { ...draft, images: uniqueImages(draft.images ?? [], draft.coverImage) };
}

function sanitizeTags(tags: string[]) {
  return tags.map(tag => tag.trim().slice(0, 80)).filter(Boolean).slice(0, 30);
}

function uniqueImages(images: string[], coverImage: string) {
  return [...new Set([coverImage, ...images].filter(Boolean))].slice(0, 30);
}

function dispatchDraftUpdate(draft: Draft) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DRAFT_STORAGE_EVENT, { detail: draft }));
  }
}
