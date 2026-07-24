import type { CopyingRisk } from "@/lib/types";

const TITLE_SIMILARITY_THRESHOLD = 0.82;
const LONG_FRAGMENT_LENGTH = 24;

type GeneratedText = { titles: { title: string }[]; body: string };
type ReferenceMaterial = { title: string; content: string };

export function assessCopyingRisk(
  generated: GeneratedText,
  references: ReferenceMaterial[],
  regenerated = false,
): CopyingRisk {
  const generatedTitles = generated.titles.map(item => normalize(item.title)).filter(Boolean);
  const referenceTitles = references.map(item => normalize(item.title)).filter(Boolean);
  const titleExactMatch = generatedTitles.some(title => referenceTitles.includes(title));
  const titleHighSimilarity = !titleExactMatch && generatedTitles.some(title =>
    referenceTitles.some(reference => diceSimilarity(title, reference) >= TITLE_SIMILARITY_THRESHOLD),
  );
  const normalizedBody = normalize(generated.body);
  const bodyLongOverlap = references.some(reference =>
    hasLongSharedFragment(normalizedBody, normalize(reference.content)),
  );
  const detected = titleExactMatch || titleHighSimilarity || bodyLongOverlap;
  return {
    status: detected ? "review" : "passed",
    titleExactMatch,
    titleHighSimilarity,
    bodyLongOverlap,
    regenerated,
    warning: detected && regenerated
      ? "轻量复制风险检查仍发现相似内容，请人工审核；此检查不属于专业查重系统。"
      : undefined,
  };
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function diceSimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const counts = new Map<string, number>();
  for (let index = 0; index < left.length - 1; index += 1) {
    const pair = left.slice(index, index + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const pair = right.slice(index, index + 2);
    const count = counts.get(pair) ?? 0;
    if (count > 0) {
      overlap += 1;
      counts.set(pair, count - 1);
    }
  }
  return (2 * overlap) / (left.length + right.length - 2);
}

function hasLongSharedFragment(left: string, right: string) {
  if (left.length < LONG_FRAGMENT_LENGTH || right.length < LONG_FRAGMENT_LENGTH) return false;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  for (let index = 0; index <= shorter.length - LONG_FRAGMENT_LENGTH; index += 1) {
    if (longer.includes(shorter.slice(index, index + LONG_FRAGMENT_LENGTH))) return true;
  }
  return false;
}
