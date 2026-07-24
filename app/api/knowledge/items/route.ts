import { NextResponse } from "next/server";
import { getKnowledgeRepository } from "@/lib/knowledge/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await getKnowledgeRepository().list();
    return NextResponse.json({ success: true, data: items });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "STORAGE_ERROR",
          message: "知识库暂时不可用。",
        },
      },
      { status: 500 },
    );
  }
}
