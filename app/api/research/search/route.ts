import { NextResponse } from "next/server";
import { createResearchAdapter, parseSelectableResearchProvider } from "@/lib/research/factory";
import { ResearchError, safeResearchMessage } from "@/lib/research/errors";
import { validateSearchRequest, validateSearchResult } from "@/lib/research/normalizer";
import { researchRateLimiter } from "@/lib/research/rate-limiter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = validateSearchRequest(body);
    const provider = parseSelectableResearchProvider(body.source);
    const data = await researchRateLimiter.run(async () => {
      const adapter = createResearchAdapter(provider);
      return (await adapter.searchContent(input)).map(validateSearchResult).slice(0, input.limit);
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const status = error instanceof ResearchError ? error.status : error instanceof SyntaxError ? 400 : 500;
    const code = error instanceof ResearchError ? error.code : error instanceof SyntaxError ? "INVALID_REQUEST" : "INTERNAL_ERROR";
    return NextResponse.json({ success: false, error: { code, message: safeResearchMessage(error) } }, { status });
  }
}
