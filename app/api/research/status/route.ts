import { NextResponse } from "next/server";
import { createResearchAdapter, parseSelectableResearchProvider } from "@/lib/research/factory";
import { ResearchError, safeResearchMessage } from "@/lib/research/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const provider = parseSelectableResearchProvider(new URL(request.url).searchParams.get("source"));
    const status = await createResearchAdapter(provider).checkLoginStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    const status = error instanceof ResearchError ? error.status : 500;
    return NextResponse.json({ success: false, error: { message: safeResearchMessage(error) } }, { status });
  }
}
