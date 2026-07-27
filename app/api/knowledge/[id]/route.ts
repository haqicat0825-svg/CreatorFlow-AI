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

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const [deletedId] = await getKnowledgeRepository().delete([id]);
    return NextResponse.json({ success: true, data: { deletedId } });
  } catch (error) {
    if (error instanceof KnowledgeRepositoryError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "INVALID_INPUT" ? 400 : 500;
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status });
    }
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "知识库暂时不可用。" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { category?: unknown };
    const item = await getKnowledgeRepository().updateCategory(id, body.category as never);
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (error instanceof KnowledgeRepositoryError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "INVALID_INPUT" ? 400 : 500;
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status });
    }
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "知识库暂时不可用。" } }, { status: 500 });
  }
}
