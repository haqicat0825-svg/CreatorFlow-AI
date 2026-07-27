import { createHash } from "node:crypto";
import type { KnowledgeItem } from "./types";

export function normalizeKnowledgeText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function knowledgeFingerprint(value: Pick<KnowledgeItem, "title" | "content">) {
  return createHash("sha256")
    .update(`${normalizeKnowledgeText(value.title)}\n${normalizeKnowledgeText(value.content)}`)
    .digest("hex");
}

export function findDuplicate(
  items: KnowledgeItem[],
  candidate: Pick<KnowledgeItem, "title" | "content" | "category">,
) {
  const fingerprint = knowledgeFingerprint(candidate);
  return items.find(item => !item.deletedAt && item.category === candidate.category && knowledgeFingerprint(item) === fingerprint);
}
