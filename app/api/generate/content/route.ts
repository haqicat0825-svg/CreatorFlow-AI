import { NextResponse } from "next/server";
import { modelErrorResponse } from "@/lib/api/model-errors";
import { parseContentBrief } from "@/lib/content/validation";
import { getServerTextModelConfig } from "@/lib/models/config-server";
import { createTextAdapter } from "@/lib/providers/factory";
import { buildRagContext } from "@/lib/knowledge/rag";
import { generateWithCopyingGuard } from "@/lib/content/generate-with-copying";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let brief;
  try {
    brief = parseContentBrief(await request.json());
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: error instanceof Error ? error.message : "请求无效。" } },
      { status: 400 },
    );
  }

  try {
    const config = getServerTextModelConfig();
    const adapter = createTextAdapter(config);
    const rag = await buildRagContext(brief);
    const { parsed, safetyReport } = await generateWithCopyingGuard(adapter, brief, rag);
    const generatedContent = {
      ...parsed,
      safetyReport,
      metadata: { provider: config.provider, model: config.model },
      isMock: config.mode === "mock",
      ragUsed: rag.sources.length > 0,
      ragReferences: rag.sources,
      /** @deprecated Use ragReferences. */
      sources: rag.sources,
    };
    return NextResponse.json({ success: true, data: generatedContent });
  } catch (error) {
    return modelErrorResponse(error);
  }
}
