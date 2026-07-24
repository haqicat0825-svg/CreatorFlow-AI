import { assessCopyingRisk } from "./copying-risk";
import { runSafetyGuard } from "./safety-guard";
import { parseModelContent } from "./validation";
import type { RagContext } from "@/lib/knowledge/rag";
import type { TextModelAdapter } from "@/lib/providers/types";
import type { ContentTask } from "@/lib/types";

export async function generateWithCopyingGuard(
  adapter: TextModelAdapter,
  brief: ContentTask,
  rag: RagContext,
) {
  let parsed = parseModelContent(await adapter.generate(brief, { ragContext: rag.text }));
  const firstRisk = assessCopyingRisk(parsed, rag.materials);
  let regenerated = false;
  if (firstRisk.status === "review") {
    regenerated = true;
    parsed = parseModelContent(await adapter.generate(brief, {
      ragContext: rag.text,
      copyingRiskRetry: true,
    }));
  }
  return {
    parsed,
    safetyReport: runSafetyGuard(parsed, rag.materials, regenerated),
  };
}
