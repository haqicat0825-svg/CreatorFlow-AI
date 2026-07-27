import { NextResponse } from "next/server";
import { getImageTaskRepository } from "@/lib/image-tasks/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  const task = id
    ? await getImageTaskRepository().get(id)
    : await getImageTaskRepository().latest();
  if (!task) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "未找到图片生成任务。" } },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { success: true, data: task },
    { headers: { "Cache-Control": "no-store" } },
  );
}
