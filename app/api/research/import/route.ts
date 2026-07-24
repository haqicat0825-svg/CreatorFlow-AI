import { NextResponse } from "next/server";
import { KnowledgeRepositoryError } from "@/lib/knowledge/repository";
import { importSelectedResearch } from "@/lib/research/importer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: await importSelectedResearch(body) });
  } catch (error) {
    const isInput = error instanceof KnowledgeRepositoryError && error.code === "INVALID_INPUT";
    return NextResponse.json({
      success: false,
      error: {
        code: isInput ? "INVALID_REQUEST" : "INTERNAL_ERROR",
        message: isInput ? error.message : "入库失败，请稍后再试。",
      },
    }, { status: isInput ? 400 : 500 });
  }
}
