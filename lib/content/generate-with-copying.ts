import { assessCopyingRisk } from "./copying-risk";
import { runSafetyGuard } from "./safety-guard";
import { parseModelContent } from "./validation";
import type { RagContext } from "@/lib/knowledge/rag";
import type { TextModelAdapter } from "@/lib/providers/types";
import type { ContentTask } from "@/lib/types";
import type { TrendContext } from "./trend-context";

export async function generateWithCopyingGuard(
  adapter: TextModelAdapter,
  brief: ContentTask,
  rag: RagContext,
  trendContext?: TrendContext,
) {
  let parsed = parseModelContent(await adapter.generate(brief, {
    ragContext: rag.text,
    trendContext,
  }));
  const firstRisk = assessCopyingRisk(parsed, rag.materials);
  let regenerated = false;
  if (firstRisk.status === "review") {
    regenerated = true;
    parsed = parseModelContent(await adapter.generate(brief, {
      ragContext: rag.text,
      trendContext,
      copyingRiskRetry: true,
    }));
  }
  return {
    parsed,
    safetyReport: runSafetyGuard(parsed, rag.materials, regenerated),
  };
}
