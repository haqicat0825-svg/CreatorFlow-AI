export const SELECTED_COVER_STORAGE_KEY = "creatorflow-selected-cover";
export const SELECTED_COVER_EVENT = "creatorflow:selected-cover";

export type SelectedCover = {
  schemaVersion: "1";
  imageUrl: string;
  imageId: string;
  source: "generated" | "library";
  prompt?: string;
  model?: string;
  provider?: string;
  selectedAt: string;
};

export function loadSelectedCover(storage: Pick<Storage, "getItem">): SelectedCover | null {
  const raw = storage.getItem(SELECTED_COVER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SelectedCover>;
    if (
      value.schemaVersion !== "1"
      || typeof value.imageId !== "string"
      || !value.imageId
      || !isSafeImageUrl(value.imageUrl)
      || !["generated", "library"].includes(value.source ?? "")
    ) return null;
    return {
      schemaVersion: "1",
      imageUrl: value.imageUrl!,
      imageId: value.imageId,
      source: value.source as SelectedCover["source"],
      prompt: cleanOptional(value.prompt, 10_000),
      model: cleanOptional(value.model, 200),
      provider: cleanOptional(value.provider, 200),
      selectedAt: typeof value.selectedAt === "string" ? value.selectedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveSelectedCover(storage: Pick<Storage, "setItem">, cover: Omit<SelectedCover, "schemaVersion" | "selectedAt">) {
  if (!isSafeImageUrl(cover.imageUrl) || !cover.imageId) throw new Error("封面图片无效。");
  const selected: SelectedCover = {
    ...cover,
    schemaVersion: "1",
    selectedAt: new Date().toISOString(),
  };
  storage.setItem(SELECTED_COVER_STORAGE_KEY, JSON.stringify(selected));
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SELECTED_COVER_EVENT, { detail: selected }));
  return selected;
}

function isSafeImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 1_500_000) return false;
  if (/^data:image\/(?:png|jpeg|webp|svg\+xml);/u.test(value)) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function cleanOptional(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) || undefined : undefined;
}

