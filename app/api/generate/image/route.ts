import { NextResponse } from "next/server";
import { modelErrorResponse } from "@/lib/api/model-errors";
import { getServerImageModelConfig } from "@/lib/models/config-server";
import type { ImageAspectRatio, ImageQuality, ServerImageModelConfig } from "@/lib/models/config-types";
import { createImageAdapter } from "@/lib/providers/image-factory";
import type { ImageGenerationRequest } from "@/lib/providers/image-types";
import { ModelAdapterError } from "@/lib/providers/types";

export const runtime = "nodejs";

const MAX_PROMPT_LENGTH = 4_000;
const MAX_NEGATIVE_PROMPT_LENGTH = 1_000;
const MAX_CANDIDATES = 4;
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60_000;
const requests = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const limited = checkRateLimit(request);
  if (limited) return limited;

  let parsed: ImageGenerationRequest & { provider?: string; model?: string };
  try {
    parsed = parseRequest(await request.json());
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: error instanceof Error ? error.message : "图片生成请求无效。" } },
      { status: 400 },
    );
  }

  try {
    const serverConfig = resolveConfig(parsed.provider, parsed.model, getServerImageModelConfig());
    const result = await createImageAdapter({
      ...serverConfig,
      aspectRatio: parsed.aspectRatio,
      size: sizeFor(parsed.aspectRatio),
      quality: parsed.quality,
      candidateCount: parsed.candidateCount,
    }).generateImage(parsed);
    return NextResponse.json({
      success: true,
      data: result,
      temporary: true,
      expiresNote: "图片为临时资源，可能过期；当前阶段不会永久保存。",
    });
  } catch (error) {
    return modelErrorResponse(error);
  }
}

function parseRequest(value: unknown): ImageGenerationRequest & { provider?: string; model?: string } {
  if (!value || typeof value !== "object") throw new Error("请求体必须是对象。");
  const input = value as Record<string, unknown>;
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt) throw new Error("Prompt 不能为空。");
  if (prompt.length > MAX_PROMPT_LENGTH) throw new Error(`Prompt 最多 ${MAX_PROMPT_LENGTH} 个字符。`);
  const negativePrompt = typeof input.negativePrompt === "string" ? input.negativePrompt.trim() : undefined;
  if (negativePrompt && negativePrompt.length > MAX_NEGATIVE_PROMPT_LENGTH) throw new Error(`Negative Prompt 最多 ${MAX_NEGATIVE_PROMPT_LENGTH} 个字符。`);
  const aspectRatio = input.aspectRatio;
  if (!["3:4", "1:1", "4:3"].includes(String(aspectRatio))) throw new Error("不支持的图片比例。");
  const quality = input.quality;
  if (!["low", "medium", "high"].includes(String(quality))) throw new Error("不支持的图片质量。");
  const candidateCount = Number(input.candidateCount);
  if (!Number.isInteger(candidateCount) || candidateCount < 1 || candidateCount > MAX_CANDIDATES) {
    throw new Error(`候选图片数量必须在 1 到 ${MAX_CANDIDATES} 之间。`);
  }
  const provider = typeof input.provider === "string" ? input.provider : undefined;
  if (provider && !["openai", "mock"].includes(provider)) throw new Error("不支持的图片 Provider。");
  const model = typeof input.model === "string" ? input.model : undefined;
  return {
    prompt,
    negativePrompt,
    aspectRatio: aspectRatio as ImageAspectRatio,
    quality: quality as ImageQuality,
    candidateCount,
    referenceContext: parseReferenceContext(input.referenceContext),
    provider,
    model,
  };
}

function parseReferenceContext(value: unknown): ImageGenerationRequest["referenceContext"] {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  const cleanList = (item: unknown) => Array.isArray(item)
    ? item.filter((entry): entry is string => typeof entry === "string").slice(0, 8).map(entry => entry.slice(0, 80))
    : undefined;
  return {
    style: cleanList(input.style),
    audience: cleanList(input.audience),
    contentGoal: typeof input.contentGoal === "string" ? input.contentGoal.slice(0, 80) : undefined,
  };
}

function resolveConfig(provider: string | undefined, model: string | undefined, server: ServerImageModelConfig): ServerImageModelConfig {
  if (provider === "mock") {
    if (model && model !== "CreatorFlow Image Demo") throw new ModelAdapterError("CONFIGURATION_MISSING", "请求的图片模型不在服务端白名单中。", 503);
    return {
      ...server,
      provider: "mock",
      mode: "mock",
      model: "CreatorFlow Image Demo",
      configured: true,
      apiKey: undefined,
    };
  }
  if (provider && provider !== server.provider) {
    throw new ModelAdapterError("CONFIGURATION_MISSING", "请求的图片 Provider 未在服务端启用。", 503);
  }
  if (model && model !== server.model) {
    throw new ModelAdapterError("CONFIGURATION_MISSING", "请求的图片模型不在服务端白名单中。", 503);
  }
  return server;
}

function checkRateLimit(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return null;
  }
  current.count += 1;
  if (current.count <= RATE_LIMIT) return null;
  return NextResponse.json(
    { success: false, error: { code: "RATE_LIMITED", message: "图片生成请求过于频繁，请稍后重试。" } },
    { status: 429, headers: { "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)) } },
  );
}

function sizeFor(ratio: ImageAspectRatio): ServerImageModelConfig["size"] {
  if (ratio === "1:1") return "1024x1024";
  if (ratio === "4:3") return "1536x1024";
  return "1024x1536";
}
