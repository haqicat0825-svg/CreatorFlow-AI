import { NextResponse } from "next/server";
import { getKnowledgeRepository } from "@/lib/knowledge/repository";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 200;
const MAX_TAGS = 20;
const MAX_LIMIT = 20;

export async function POST(request: Request) {
  try {
    const { query, tags, limit } = parseRequest(await request.json());
    const results = await getKnowledgeRepository().search(query, { tags, limit });
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    const invalid = error instanceof KnowledgeSearchRequestError;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: invalid ? "INVALID_REQUEST" : "STORAGE_ERROR",
          message: invalid ? error.message : "知识库暂时不可用。",
        },
      },
      { status: invalid ? 400 : 500 },
    );
  }
}

function parseRequest(value: unknown) {
  if (!value || typeof value !== "object") throw invalidRequest("请求体必须是对象。");
  const input = value as Record<string, unknown>;
  if (typeof input.query !== "string" || !input.query.trim() || input.query.length > MAX_QUERY_LENGTH) {
    throw invalidRequest(`检索关键词不能为空且不能超过 ${MAX_QUERY_LENGTH} 个字符。`);
  }
  const tags = input.tags === undefined ? undefined : parseTags(input.tags);
  const limit = input.limit === undefined ? 5 : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw invalidRequest(`结果数量必须在 1-${MAX_LIMIT} 之间。`);
  }
  return { query: input.query.trim(), tags, limit };
}

function parseTags(value: unknown) {
  if (
    !Array.isArray(value)
    || value.length > MAX_TAGS
    || value.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > 60)
  ) {
    throw invalidRequest("标签格式无效。");
  }
  return [...new Set(value.map(tag => String(tag).trim()))];
}

class KnowledgeSearchRequestError extends Error {}

function invalidRequest(message: string) {
  return new KnowledgeSearchRequestError(message);
}
