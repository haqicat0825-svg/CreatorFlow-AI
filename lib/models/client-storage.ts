const PREFERENCE_KEY = "creatorflow-model-preferences";
const IMAGE_PREFERENCE_KEY = "creatorflow-image-preferences";

export function migrateLegacyModelStorage(storage: Storage) {
  if (!storage || typeof storage.length !== "number") return;
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (!key?.startsWith("creatorflow")) continue;
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const value = JSON.parse(raw);
      if (value && typeof value === "object" && "apiKey" in value) {
        const { apiKey: _discarded, ...safe } = value as Record<string, unknown>;
        storage.setItem(key, JSON.stringify(safe));
      }
    } catch {
      // Non-JSON preferences are unrelated and left untouched.
    }
  }
}

export function saveModelPreferences(storage: Storage, value: { mode: string; provider: string; model: string }) {
  storage.setItem(PREFERENCE_KEY, JSON.stringify(value));
}

export type ImagePreferences = {
  provider: string;
  model: string;
  aspectRatio: string;
  quality: string;
  candidateCount: number;
};

export function saveImagePreferences(storage: Storage, value: ImagePreferences) {
  storage.setItem(IMAGE_PREFERENCE_KEY, JSON.stringify(value));
}

export function loadImagePreferences(storage: Storage): ImagePreferences | null {
  try {
    const value = JSON.parse(storage.getItem(IMAGE_PREFERENCE_KEY) ?? "null");
    if (!value || typeof value !== "object" || "apiKey" in value || "baseUrl" in value) return null;
    return value as ImagePreferences;
  } catch {
    return null;
  }
}
