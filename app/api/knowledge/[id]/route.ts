import { NextResponse } from "next/server";
import { getKnowledgeRepository, KnowledgeRepositoryError } from "@/lib/knowledge/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ success: true, data: await getKnowledgeRepository().getById(id) });
  } catch (error) {
    if (error instanceof KnowledgeRepositoryError && error.code === "NOT_FOUND") {
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "知识库暂时不可用。" } }, { status: 500 });
  }
}
