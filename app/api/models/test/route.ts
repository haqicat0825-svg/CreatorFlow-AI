import { NextResponse } from "next/server";
import { getServerImageModelConfig, getServerTextModelConfig } from "@/lib/models/config-server";
import { createTextAdapter } from "@/lib/providers/factory";
import { ModelAdapterError } from "@/lib/providers/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let kind = "text";
  try {
    const body = await request.json();
    if (body?.kind === "image") kind = "image";
  } catch {
    // Backwards-compatible text test when no JSON body is sent.
  }
  if (kind === "image") {
    const config = getServerImageModelConfig();
    return NextResponse.json({
      success: config.configured,
      provider: config.provider,
      model: config.model,
      mode: config.mode,
      configured: config.configured,
      check: config.mode === "cloud" ? "CONFIG_COMPLETE_GENERATION_PENDING" : "MOCK_READY",
      settings: {
        aspectRatio: config.aspectRatio,
        quality: config.quality,
        candidateCount: config.candidateCount,
      },
      ...(config.configured ? {} : { error: { code: "CONFIGURATION_MISSING" } }),
    }, { status: config.configured ? 200 : 503 });
  }

  const config = getServerTextModelConfig();
  const started = performance.now();
  try {
    const connection = await createTextAdapter(config).testConnection();
    return NextResponse.json({
      success: true,
      provider: config.provider,
      model: config.model,
      isMock: config.mode === "mock",
      upstreamConnected: connection.upstreamConnected,
      contentContractValid: null,
      diagnostics: connection.diagnostics,
      latency: Math.round(performance.now() - started),
    });
  } catch (error) {
    const code = error instanceof ModelAdapterError ? error.code : "INTERNAL_ERROR";
    const status = error instanceof ModelAdapterError ? error.status : 500;
    return NextResponse.json({
      success: false,
      provider: config.provider,
      model: config.model,
      isMock: config.mode === "mock",
      upstreamConnected: error instanceof ModelAdapterError
        ? error.diagnostics?.upstreamConnected ?? false
        : false,
      contentContractValid: null,
      diagnostics: error instanceof ModelAdapterError ? error.diagnostics : undefined,
      latency: Math.round(performance.now() - started),
      error: { code },
    }, { status });
  }
}
