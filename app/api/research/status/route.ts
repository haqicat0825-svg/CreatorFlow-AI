import { NextResponse } from "next/server";
import { createResearchAdapter } from "@/lib/research/factory";

export const runtime = "nodejs";

export async function GET() {
  const status = await createResearchAdapter().checkLoginStatus();
  return NextResponse.json({ success: true, data: status });
}
