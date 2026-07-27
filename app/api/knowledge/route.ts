import { NextResponse } from "next/server";
import { getKnowledgeRepository, KnowledgeRepositoryError } from "@/lib/knowledge/repository";
import type { CreateKnowledgeItemInput } from "@/lib/knowledge/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const repository = getKnowledgeRepository();
    if (query) {
      const results = await repository.search(query, {
        tags: url.searchParams.getAll("tag"),
        limit: Number(url.searchParams.get("limit")) || 20,
      });
      return NextResponse.json({
        success: true,
        data: results.map(result => ({
          ...result.item,
          relevance: { score: result.score, matchedTerms: result.matchedTerms },
        })),
      });
    }
    return NextResponse.json({ success: true, data: await repository.list() });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as CreateKnowledgeItemInput;
    const item = await getKnowledgeRepository().create(input);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: { code: "INVALID_INPUT", message: "请求正文不是有效 JSON。" } }, { status: 400 });
    }
    return knowledgeErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as { ids?: unknown };
    if (!Array.isArray(body.ids) || body.ids.some(id => typeof id !== "string")) {
      throw new KnowledgeRepositoryError("INVALID_INPUT", "删除列表无效。");
    }
    const deletedIds = await getKnowledgeRepository().delete(body.ids);
    return NextResponse.json({ success: true, data: { deletedIds } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: { code: "INVALID_INPUT", message: "请求正文不是有效 JSON。" } }, { status: 400 });
    }
    return knowledgeErrorResponse(error);
  }
}

function knowledgeErrorResponse(error: unknown) {
  if (error instanceof KnowledgeRepositoryError) {
    const status = error.code === "DUPLICATE" ? 409 : error.code === "NOT_FOUND" ? 404 : error.code === "INVALID_INPUT" ? 400 : 500;
    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.existingId ? { existingId: error.existingId } : {}),
      },
    }, { status });
  }
  return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "知识库暂时不可用。" } }, { status: 500 });
}
