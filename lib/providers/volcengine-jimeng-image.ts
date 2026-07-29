import { ModelAdapterError } from "./types";
import type { ImageAdapterConfig, ImageGenerationAdapter, ImageGenerationRequest } from "./image-types";

const ARK_IMAGE_GENERATIONS_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const DEFAULT_TIMEOUT_MS = 180_000;

export function createVolcengineJimengImageAdapter(config: ImageAdapterConfig): ImageGenerationAdapter {
  return {
    id: "volcengine-jimeng-image",
    model: config.model,
    async generateImage(request: ImageGenerationRequest) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
      try {
        const response = await fetch(ARK_IMAGE_GENERATIONS_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            prompt: request.prompt,
            response_format: "url",
            size: "2K",
            watermark: false,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw await mapArkError(response);

        const payload = await response.json() as { data?: Array<{ url?: string }> };
        const imageUrl = payload.data?.[0]?.url;
        if (!imageUrl) {
          throw new ModelAdapterError("INVALID_RESPONSE", "图片服务未返回可用资源。", 502);
        }

        const dimensions = dimensionsFor(request.aspectRatio);
        const generationId = crypto.randomUUID();
        return {
          images: [{
            id: `${generationId}-1`,
            url: imageUrl,
            width: dimensions.width,
            height: dimensions.height,
            mimeType: "image/png",
          }],
          provider: "volcengine-jimeng",
          model: config.model,
          isMock: false,
          safetyWarnings: [],
          generationId,
        };
      } catch (error) {
        if (error instanceof ModelAdapterError) throw error;
        if (isAbortError(error)) {
          throw new ModelAdapterError("IMAGE_PROVIDER_TIMEOUT", "图片生成超时。", 504);
        }
        throw new ModelAdapterError("UPSTREAM_ERROR", "图片服务暂时不可用。", 502);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function dimensionsFor(ratio: ImageGenerationRequest["aspectRatio"]) {
  if (ratio === "1:1") return { width: 2048, height: 2048 };
  if (ratio === "4:3") return { width: 2048, height: 1536 };
  return { width: 1536, height: 2048 };
}

async function mapArkError(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return new ModelAdapterError("UNAUTHORIZED", "图片服务鉴权失败。", 502);
  }
  if (response.status === 429) {
    return new ModelAdapterError("RATE_LIMITED", "图片服务请求过于频繁。", 429);
  }
  if (response.status === 408 || response.status === 504) {
    return new ModelAdapterError("IMAGE_PROVIDER_TIMEOUT", "图片生成超时。", 504);
  }
  return new ModelAdapterError("UPSTREAM_ERROR", "图片服务暂时不可用。", 502);
}

function isAbortError(error: unknown): error is { name: "AbortError" } {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

function getTimeoutMs(env: NodeJS.ProcessEnv = process.env) {
  const configured = Number.parseInt(env.VOLCENGINE_IMAGE_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS;
}
